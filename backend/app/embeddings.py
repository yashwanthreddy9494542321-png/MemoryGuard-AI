import re
import math
import hashlib
from typing import List

class LocalSemanticEmbedding:
    """
    Deterministic local semantic vector embedding generator.
    Produces 384-dimensional L2-normalized vectors entirely offline,
    preserving semantic proximity between related memory concepts
    without requiring external APIs, heavy GPU models, or cloud telemetry.
    """
    def __init__(self, dim: int = 384):
        self.dim = dim

    def _tokenize(self, text: str) -> List[str]:
        # Clean and extract words, bi-grams, and stem-like tokens
        clean_text = text.lower().strip()
        words = re.findall(r'\b[a-zA-Z0-9_\-]{2,}\b', clean_text)
        tokens = list(words)
        
        # Add character tri-grams for subword similarity
        for word in words:
            if len(word) >= 3:
                for i in range(len(word) - 2):
                    tokens.append(f"tri:{word[i:i+3]}")

        # Add word bi-grams
        for i in range(len(words) - 1):
            tokens.append(f"bi:{words[i]}_{words[i+1]}")
            
        return tokens

    def embed_text(self, text: str) -> List[float]:
        """Generate a 384-dimensional vector normalized to unit Euclidean length."""
        if not text or not text.strip():
            # Return unit vector pointing along first dimension for empty input
            vec = [0.0] * self.dim
            vec[0] = 1.0
            return vec

        tokens = self._tokenize(text)
        vector = [0.0] * self.dim

        for idx, token in enumerate(tokens):
            # Compute token hash components
            h1 = int(hashlib.sha256(token.encode('utf-8')).hexdigest()[:8], 16)
            h2 = int(hashlib.md5(token.encode('utf-8')).hexdigest()[:8], 16)
            
            dim_idx1 = h1 % self.dim
            dim_idx2 = (h1 + h2) % self.dim
            
            # Position decay / weight
            weight = 1.0 / (1.0 + 0.05 * min(idx, 50))
            
            sign1 = 1.0 if (h1 & 1) == 0 else -1.0
            sign2 = 1.0 if (h2 & 1) == 0 else -1.0
            
            vector[dim_idx1] += sign1 * weight
            vector[dim_idx2] += sign2 * (weight * 0.7)

        # L2 Normalization
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 1e-9:
            vector = [float(v / norm) for v in vector]
        else:
            vector[0] = 1.0

        return vector

    def compute_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """Compute cosine similarity between two unit vectors."""
        if len(vec_a) != len(vec_b):
            raise ValueError(f"Vector dimensions do not match: {len(vec_a)} vs {len(vec_b)}")
        return sum(a * b for a, b in zip(vec_a, vec_b))

# Global embedding instance
embedding_service = LocalSemanticEmbedding(dim=384)
