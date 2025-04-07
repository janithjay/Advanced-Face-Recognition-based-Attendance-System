import os
import pickle
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from deepface import DeepFace
from scipy.spatial.distance import cosine
from sklearn.metrics import confusion_matrix, accuracy_score
import random
import time

# Paths
MODEL_PATH = 'trained_models/face_recognition_model'
KNOWN_FACES_DIR = 'known_faces'
TEST_FACES_DIR = 'test_faces'  # Optional: Create this directory with test images

def load_trained_embeddings(embeddings_file=MODEL_PATH):
    """Load pre-trained embeddings from file"""
    try:
        with open(embeddings_file, 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        print(f"No pre-trained embeddings found at {embeddings_file}. Run model training first.")
        return {}
    except Exception as e:
        print(f"Error loading embeddings: {str(e)}")
        return {}

def extract_face_embedding(image_path, model_name="Facenet512"):
    """Extract face embedding from an image with timing"""
    start_time = time.time()
    try:
        embedding = DeepFace.represent(
            img_path=image_path,
            model_name=model_name,
            enforce_detection=False,
            detector_backend="mediapipe"
        )[0]['embedding']
        processing_time = time.time() - start_time
        return embedding, processing_time
    except Exception as e:
        print(f"Error extracting embedding from {image_path}: {str(e)}")
        return None, 0

def recognize_face(face_embedding, known_faces, threshold=0.3):
    """Recognize a face embedding against known faces"""
    best_match = "Unknown"
    min_distance = threshold
    
    for person_name, embeddings in known_faces.items():
        for stored_embedding in embeddings:
            distance = cosine(face_embedding, stored_embedding)
            if distance < min_distance:
                best_match = person_name
                min_distance = distance
    
    confidence = max(0, 1 - min_distance)
    return best_match, confidence

def simulate_loss(true_labels, predicted_labels, confidences):
    """Simulate loss based on prediction errors"""
    # Loss as inverse of confidence when wrong, 0 when correct
    loss = [1 - conf if true != pred else 0 for true, pred, conf in zip(true_labels, predicted_labels, confidences)]
    return np.array(loss)

def evaluate_model(test_dir=TEST_FACES_DIR, known_faces_dir=KNOWN_FACES_DIR):
    """Evaluate model accuracy and collect metrics"""
    known_faces = load_trained_embeddings()
    if not known_faces:
        raise ValueError("No trained embeddings loaded.")

    true_labels = []
    predicted_labels = []
    confidences = []
    processing_times = []

    # If no test directory, simulate using known faces
    if not os.path.exists(test_dir):
        print("No test directory found. Simulating with known faces...")
        test_images = []
        for person_name in os.listdir(known_faces_dir):
            person_dir = os.path.join(known_faces_dir, person_name)
            if os.path.isdir(person_dir):
                for img_name in os.listdir(person_dir):
                    img_path = os.path.join(person_dir, img_name)
                    test_images.append((img_path, person_name))
        
        random.shuffle(test_images)
        test_images = test_images[:min(20, len(test_images))]  # Limit to 20
        
        for img_path, true_name in test_images:
            embedding, proc_time = extract_face_embedding(img_path)
            if embedding is not None:
                pred_name, confidence = recognize_face(embedding, known_faces)
                true_labels.append(true_name)
                predicted_labels.append(pred_name)
                confidences.append(confidence)
                processing_times.append(proc_time)
    else:
        # Use actual test directory
        for person_name in os.listdir(test_dir):
            person_dir = os.path.join(test_dir, person_name)
            if os.path.isdir(person_dir):
                for img_name in os.listdir(person_dir):
                    img_path = os.path.join(person_dir, img_name)
                    embedding, proc_time = extract_face_embedding(img_path)
                    if embedding is not None:
                        pred_name, confidence = recognize_face(embedding, known_faces)
                        true_labels.append(person_name)
                        predicted_labels.append(pred_name)
                        confidences.append(confidence)
                        processing_times.append(proc_time)

    # Simulate loss
    loss = simulate_loss(true_labels, predicted_labels, confidences)
    return true_labels, predicted_labels, confidences, processing_times, loss

def plot_confusion_matrix(true_labels, predicted_labels):
    """Plot confusion matrix"""
    labels = sorted(set(true_labels + predicted_labels))
    cm = confusion_matrix(true_labels, predicted_labels, labels=labels)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.title('Confusion Matrix')
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig('confusion_matrix.png')
    plt.close()

def plot_accuracy_vs_threshold(true_labels, predicted_labels, confidences):
    """Plot accuracy vs. confidence threshold"""
    thresholds = np.arange(0.1, 1.0, 0.1)
    accuracies = []
    
    for thresh in thresholds:
        thresh_preds = [pred if conf >= thresh else "Unknown" 
                        for pred, conf in zip(predicted_labels, confidences)]
        accuracy = accuracy_score(true_labels, thresh_preds)
        accuracies.append(accuracy)

    plt.figure(figsize=(10, 6))
    plt.plot(thresholds, accuracies, marker='o', linestyle='-', color='green')
    plt.title('Accuracy vs. Confidence Threshold')
    plt.xlabel('Confidence Threshold')
    plt.ylabel('Accuracy')
    plt.grid(True)
    plt.tight_layout()
    plt.savefig('accuracy_vs_threshold.png')
    plt.close()

def plot_confidence_distribution(confidences):
    """Plot distribution of confidence scores"""
    plt.figure(figsize=(10, 6))
    plt.hist(confidences, bins=20, color='purple', alpha=0.7, density=True)
    plt.title('Confidence Score Distribution')
    plt.xlabel('Confidence Score')
    plt.ylabel('Density')
    plt.grid(True)
    plt.tight_layout()
    plt.savefig('confidence_distribution.png')
    plt.close()

def plot_processing_time(processing_times):
    """Plot processing time per image"""
    plt.figure(figsize=(10, 6))
    plt.plot(processing_times, label='Processing Time', color='orange', marker='.')
    plt.title('Processing Time Per Image')
    plt.xlabel('Image Number')
    plt.ylabel('Time (seconds)')
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.savefig('processing_time.png')
    plt.close()

def plot_loss(loss):
    """Plot simulated loss over evaluations"""
    plt.figure(figsize=(10, 6))
    plt.plot(loss, label='Loss', color='red', marker='o')
    plt.title('Simulated Loss Over Evaluations')
    plt.xlabel('Evaluation Step')
    plt.ylabel('Loss')
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.savefig('loss_over_evaluations.png')
    plt.close()

def main():
    print("Evaluating Face Recognition Model...")
    try:
        true_labels, predicted_labels, confidences, processing_times, loss = evaluate_model()
        
        if not true_labels:
            print("No test data available to evaluate.")
            return

        # Calculate overall accuracy
        overall_accuracy = accuracy_score(true_labels, predicted_labels)
        print(f"Overall Model Accuracy: {overall_accuracy:.2f}")
        print(f"Average Confidence: {np.mean(confidences):.2f}")
        print(f"Average Processing Time: {np.mean(processing_times):.3f} seconds")
        print(f"Average Simulated Loss: {np.mean(loss):.2f}")

        # Generate plots
        plot_confusion_matrix(true_labels, predicted_labels)
        plot_accuracy_vs_threshold(true_labels, predicted_labels, confidences)
        plot_confidence_distribution(confidences)
        plot_processing_time(processing_times)
        plot_loss(loss)

        # Technical considerations
        print("\nTechnical Considerations:")
        print("1. Threshold Impact: Higher thresholds reduce false positives but may miss true matches.")
        print("2. Processing Speed: Varies with hardware; optimize for real-time use.")
        print("3. Data Quality: Poor lighting or angles can lower confidence (check distribution).")
        print("4. Model Robustness: Test with diverse faces to avoid bias.")
        print("5. Simulated Loss: Indicates error rate; refine with actual training loss if available.")

    except Exception as e:
        print(f"Error during evaluation: {str(e)}")

if __name__ == "__main__":
    # Check dependencies
    try:
        import matplotlib
        import seaborn
        import deepface
    except ImportError:
        print("Please install required libraries: pip install matplotlib seaborn deepface")
        exit(1)
    
    main()