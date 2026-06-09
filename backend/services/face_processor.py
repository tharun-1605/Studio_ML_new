import os
import cv2
import numpy as np
import faiss
import json
import face_recognition

class FaceProcessor:
    def __init__(self, event_id: str):
        self.event_id = event_id
        self.base_dir = os.path.join("data", "events", event_id)
        self.photos_dir = os.path.join(self.base_dir, "photos")
        self.index_dir = os.path.join(self.base_dir, "index")
        self.index_file = os.path.join(self.index_dir, "index.faiss")
        self.mapping_file = os.path.join(self.index_dir, "mapping.json")
        
        self.embedding_dim = 128
        
        # Initialize FAISS Index (L2 distance)
        if os.path.exists(self.index_file):
            self.index = faiss.read_index(self.index_file)
        else:
            self.index = faiss.IndexFlatL2(self.embedding_dim)
            
        # Initialize Mapping (FAISS ID -> photo_id/filename)
        if os.path.exists(self.mapping_file):
            with open(self.mapping_file, "r") as f:
                self.mapping = json.load(f)
        else:
            self.mapping = {} # key: str(faiss_id), value: str(filename)
            
        self.next_id = len(self.mapping)

    def _save_index(self):
        faiss.write_index(self.index, self.index_file)
        with open(self.mapping_file, "w") as f:
            json.dump(self.mapping, f)

    def process_image(self, filename: str, image_path: str):
        """Extract faces from an image and add to FAISS index."""
        try:
            image = face_recognition.load_image_file(image_path)
            face_locations = face_recognition.face_locations(image)
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            if not face_encodings:
                return False
                
            embeddings = np.array(face_encodings, dtype=np.float32)
            
            # Add to FAISS and map IDs
            for emb in embeddings:
                # faiss.add takes a 2D array
                self.index.add(np.expand_dims(emb, axis=0))
                self.mapping[str(self.next_id)] = filename
                self.next_id += 1
                
            self._save_index()
            return True
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            return False

    def search_faces(self, selfie_path: str, top_k: int = 10, threshold: float = 0.6):
        """Search for a face in the FAISS index."""
        if self.index.ntotal == 0:
            return []
            
        try:
            image = face_recognition.load_image_file(selfie_path)
            face_locations = face_recognition.face_locations(image)
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            if not face_encodings:
                return []
                
            # Use the first face found in the selfie
            query_emb = np.array(face_encodings[0], dtype=np.float32)
            query_emb = np.expand_dims(query_emb, axis=0)
            
            # Search
            distances, indices = self.index.search(query_emb, top_k)
            
            matched_photos = set()
            for i, dist in zip(indices[0], distances[0]):
                if i != -1 and dist <= threshold:
                    filename = self.mapping.get(str(i))
                    if filename:
                        matched_photos.add(filename)
                        
            return list(matched_photos)
        except Exception as e:
            print(f"Error searching face: {e}")
            return []
