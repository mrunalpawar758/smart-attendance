"""
Face Recognition Service
========================
Wraps face_recognition library (dlib-based) with graceful fallback
when the native library is not installed.

Architecture:
  detect_faces(image)   -> list of face locations
  encode_faces(image)   -> list of 128-d encodings
  register_face(...)    -> save encodings to DB
  recognize_faces(...)  -> compare live frame against DB encodings
"""

import base64
import json
import logging
from io import BytesIO
from typing import List, Optional, Tuple, Dict

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Attempt to import optional heavy deps
try:
    import face_recognition as fr
    FACE_RECOGNITION_AVAILABLE = True
    logger.info("face_recognition library loaded successfully")
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    logger.warning(
        "face_recognition library not available. "
        "Face recognition features will return stub responses. "
        "Install dlib + face_recognition to enable."
    )

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------

def decode_base64_image(b64_string: str) -> Optional[np.ndarray]:
    """Decode a base64-encoded image (JPEG/PNG) to an RGB numpy array."""
    try:
        # Strip data-URI prefix if present
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
        raw = base64.b64decode(b64_string)
        img = Image.open(BytesIO(raw)).convert("RGB")
        return np.array(img)
    except Exception as e:
        logger.error(f"Image decode error: {e}")
        return None


def resize_image(img: np.ndarray, max_size: int = 800) -> np.ndarray:
    h, w = img.shape[:2]
    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        img = np.array(Image.fromarray(img).resize((new_w, new_h)))
    return img


# ---------------------------------------------------------------------------
# Core face operations
# ---------------------------------------------------------------------------

def detect_faces(img_array: np.ndarray, model: str = "hog") -> List[Tuple]:
    """Return list of (top, right, bottom, left) face locations."""
    if not FACE_RECOGNITION_AVAILABLE:
        return []
    img_array = resize_image(img_array)
    return fr.face_locations(img_array, model=model)


def encode_faces(img_array: np.ndarray, locations: List[Tuple] = None) -> List[List[float]]:
    """Return list of 128-d face encodings."""
    if not FACE_RECOGNITION_AVAILABLE:
        return []
    img_array = resize_image(img_array)
    if locations is None:
        locations = fr.face_locations(img_array)
    encodings = fr.face_encodings(img_array, known_face_locations=locations)
    return [enc.tolist() for enc in encodings]


def compare_faces(
    known_encodings: List[List[float]],
    face_encoding: List[float],
    tolerance: float = 0.55,
) -> Tuple[bool, float]:
    """
    Compare a face encoding against a list of known encodings.
    Returns (is_match, best_confidence_score).
    Confidence = 1 - min_distance (higher is better).
    """
    if not FACE_RECOGNITION_AVAILABLE or not known_encodings:
        return False, 0.0

    known_np = [np.array(enc) for enc in known_encodings]
    face_np = np.array(face_encoding)

    distances = fr.face_distance(known_np, face_np)
    min_dist = float(np.min(distances))
    confidence = round(1.0 - min_dist, 4)
    is_match = min_dist <= tolerance

    return is_match, confidence


# ---------------------------------------------------------------------------
# Database-backed registration & recognition
# ---------------------------------------------------------------------------

def register_student_face(
    db,
    student_id: int,
    image_b64_list: List[str],
    registered_by_id: int,
) -> Dict:
    """
    Process multiple images, extract face encodings, store in face_profiles table.
    Returns summary dict.
    """
    from app.models.face_profile import FaceProfile
    from app.models.student import Student

    if not FACE_RECOGNITION_AVAILABLE:
        return {
            "success": False,
            "error": "face_recognition library not installed on server",
            "encodings_saved": 0,
        }

    all_encodings = []
    errors = []

    for idx, b64 in enumerate(image_b64_list):
        img = decode_base64_image(b64)
        if img is None:
            errors.append(f"Image {idx+1}: could not decode")
            continue

        locations = detect_faces(img)
        if not locations:
            errors.append(f"Image {idx+1}: no face detected")
            continue
        if len(locations) > 1:
            errors.append(f"Image {idx+1}: multiple faces detected, using first")

        encodings = encode_faces(img, locations[:1])
        if encodings:
            all_encodings.extend(encodings)

    if not all_encodings:
        return {"success": False, "error": "No valid face encodings extracted", "details": errors}

    # Upsert face profile
    profile = db.query(FaceProfile).filter(FaceProfile.student_id == student_id).first()
    if profile:
        profile.encodings_json = json.dumps(all_encodings)
        profile.sample_count = len(all_encodings)
        profile.registered_by = registered_by_id
        profile.is_active = True
    else:
        profile = FaceProfile(
            student_id=student_id,
            encodings_json=json.dumps(all_encodings),
            sample_count=len(all_encodings),
            registered_by=registered_by_id,
        )
        db.add(profile)

    # Mark student as face_registered
    student = db.query(Student).filter(Student.id == student_id).first()
    if student:
        student.face_registered = True

    db.commit()
    return {
        "success": True,
        "encodings_saved": len(all_encodings),
        "warnings": errors,
    }


def recognize_from_frame(
    db,
    image_b64: str,
    class_id: int,
    tolerance: float = 0.55,
) -> List[Dict]:
    """
    Detect and recognize all faces in a frame.
    Only attempts to match against students enrolled in class_id
    who have registered face profiles.

    Returns list of result dicts per detected face.
    """
    from app.models.face_profile import FaceProfile
    from app.models.student import Student
    from app.models.associations import student_classes

    results = []

    if not FACE_RECOGNITION_AVAILABLE:
        return [{"status": "UNAVAILABLE", "message": "face_recognition library not installed"}]

    img = decode_base64_image(image_b64)
    if img is None:
        return [{"status": "ERROR", "message": "Could not decode image"}]

    img = resize_image(img)
    locations = detect_faces(img)

    if not locations:
        return []

    live_encodings = encode_faces(img, locations)

    # Load all registered profiles for students in this class
    enrolled_students = (
        db.query(Student)
        .join(student_classes, Student.id == student_classes.c.student_id)
        .filter(student_classes.c.class_id == class_id, Student.face_registered == True)
        .all()
    )

    profiles_map = {}
    for student in enrolled_students:
        profile = db.query(FaceProfile).filter(
            FaceProfile.student_id == student.id,
            FaceProfile.is_active == True,
        ).first()
        if profile:
            try:
                encodings = json.loads(profile.encodings_json)
                profiles_map[student.id] = {
                    "student": student,
                    "encodings": encodings,
                }
            except Exception:
                pass

    # Match each detected face
    for i, live_enc in enumerate(live_encodings):
        best_match = None
        best_confidence = 0.0

        for sid, data in profiles_map.items():
            is_match, confidence = compare_faces(data["encodings"], live_enc, tolerance)
            if is_match and confidence > best_confidence:
                best_confidence = confidence
                best_match = data["student"]

        if best_match:
            results.append({
                "status": "RECOGNIZED",
                "student_id": best_match.id,
                "student_name": best_match.user.full_name,
                "roll_number": best_match.roll_number,
                "confidence": best_confidence,
                "marked_present": best_confidence >= tolerance,
            })
        else:
            results.append({
                "status": "UNKNOWN",
                "student_id": None,
                "student_name": None,
                "roll_number": None,
                "confidence": best_confidence,
                "marked_present": False,
            })

    return results
