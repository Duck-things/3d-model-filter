"""
AI Model Thumbnail Classifier Training Script
=============================================

Train a neural network to detect AI-generated 3D model thumbnails.
By Achyut Sharma

Usage:
    python train_model.py

Output:
    - saved_model/           : TensorFlow SavedModel format
    - tfjs_model/            : TensorFlow.js format (for browser)
    - training_history.png   : Training progress graph
"""

import os
import json
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime

# TensorFlow imports
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint

# For conversion to TensorFlow.js
import tensorflowjs as tfjs

# ============== CONFIGURATION ==============

CONFIG = {
    # Data settings
    "dataset_path": "dataset",
    "image_size": 224,  # MobileNetV2 expects 224x224
    "batch_size": 32,
    "validation_split": 0.2,  # 20% for validation
    
    # Training settings
    "epochs_phase1": 20,  # Initial training (frozen base)
    "epochs_phase2": 10,  # Fine-tuning (unfrozen layers)
    "learning_rate_phase1": 0.001,
    "learning_rate_phase2": 0.0001,
    
    # Output settings
    "output_dir": "tfjs_model",
    "saved_model_dir": "saved_model"
}

def print_header(text):
    """Print a formatted header."""
    print()
    print("=" * 60)
    print(text)
    print("=" * 60)
    print()

def create_data_generators():
    """Create training and validation data generators with augmentation."""
    
    print_header("Setting Up Data Generators")
    
    # Data augmentation for training
    # This creates variations of images to help the model generalize
    train_datagen = ImageDataGenerator(
        rescale=1./255,              # Normalize pixel values to 0-1
        rotation_range=20,           # Random rotation up to 20 degrees
        width_shift_range=0.2,       # Random horizontal shift
        height_shift_range=0.2,      # Random vertical shift
        horizontal_flip=True,        # Random horizontal flip
        zoom_range=0.15,             # Random zoom
        brightness_range=[0.8, 1.2], # Random brightness
        validation_split=CONFIG["validation_split"]
    )
    
    # Validation data - no augmentation, just rescaling
    val_datagen = ImageDataGenerator(
        rescale=1./255,
        validation_split=CONFIG["validation_split"]
    )
    
    print(f"Loading images from: {CONFIG['dataset_path']}")
    print(f"Image size: {CONFIG['image_size']}x{CONFIG['image_size']}")
    print(f"Batch size: {CONFIG['batch_size']}")
    print()
    
    # Training generator
    train_generator = train_datagen.flow_from_directory(
        CONFIG["dataset_path"],
        target_size=(CONFIG["image_size"], CONFIG["image_size"]),
        batch_size=CONFIG["batch_size"],
        class_mode='categorical',
        subset='training',
        shuffle=True
    )
    
    # Validation generator
    validation_generator = val_datagen.flow_from_directory(
        CONFIG["dataset_path"],
        target_size=(CONFIG["image_size"], CONFIG["image_size"]),
        batch_size=CONFIG["batch_size"],
        class_mode='categorical',
        subset='validation',
        shuffle=False
    )
    
    # Print class information
    print()
    print("Classes found:")
    for class_name, class_index in train_generator.class_indices.items():
        print(f"  {class_index}: {class_name}")
    
    print()
    print(f"Training samples: {train_generator.samples}")
    print(f"Validation samples: {validation_generator.samples}")
    
    return train_generator, validation_generator

def build_model(num_classes):
    """Build the neural network model using transfer learning."""
    
    print_header("Building Model")
    
    # Load MobileNetV2 pre-trained on ImageNet
    # This model already knows how to recognize shapes, textures, etc.
    print("Loading MobileNetV2 base model (pre-trained on ImageNet)...")
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,  # Don't include the classification layer
        input_shape=(CONFIG["image_size"], CONFIG["image_size"], 3)
    )
    
    # Freeze the base model layers initially
    # We'll train only our custom layers first
    base_model.trainable = False
    
    print(f"Base model layers: {len(base_model.layers)}")
    print("Base model frozen for initial training")
    
    # Add our custom classification layers on top
    x = base_model.output
    x = GlobalAveragePooling2D()(x)  # Convert features to a single vector
    x = BatchNormalization()(x)
    x = Dense(256, activation='relu')(x)  # Hidden layer
    x = Dropout(0.5)(x)  # Prevent overfitting
    x = Dense(128, activation='relu')(x)  # Another hidden layer
    x = Dropout(0.3)(x)
    
    # Output layer: probability for each class
    outputs = Dense(num_classes, activation='softmax', name='predictions')(x)
    
    # Create the final model
    model = Model(inputs=base_model.input, outputs=outputs)
    
    print()
    print("Model architecture:")
    print(f"  Input shape: {model.input_shape}")
    print(f"  Output shape: {model.output_shape}")
    print(f"  Total parameters: {model.count_params():,}")
    
    return model, base_model

def train_model(model, base_model, train_gen, val_gen):
    """Train the model in two phases."""
    
    # ===== PHASE 1: Train with frozen base =====
    print_header("Phase 1: Training Custom Layers")
    print("(Base model frozen, only training our added layers)")
    print()
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=CONFIG["learning_rate_phase1"]),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Callbacks to improve training
    callbacks_phase1 = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=0.00001,
            verbose=1
        )
    ]
    
    history1 = model.fit(
        train_gen,
        epochs=CONFIG["epochs_phase1"],
        validation_data=val_gen,
        callbacks=callbacks_phase1,
        verbose=1
    )
    
    # ===== PHASE 2: Fine-tune with unfrozen layers =====
    print_header("Phase 2: Fine-tuning")
    print("(Unfreezing top layers of base model)")
    print()
    
    # Unfreeze the top layers of the base model
    base_model.trainable = True
    
    # Keep the bottom layers frozen (they learn general features)
    # Only fine-tune the top 30 layers
    for layer in base_model.layers[:-30]:
        layer.trainable = False
    
    trainable_layers = sum(1 for layer in base_model.layers if layer.trainable)
    print(f"Unfrozen {trainable_layers} layers for fine-tuning")
    
    # Recompile with a lower learning rate
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=CONFIG["learning_rate_phase2"]),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    callbacks_phase2 = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=2,
            min_lr=0.000001,
            verbose=1
        ),
        ModelCheckpoint(
            'best_model.keras',
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]
    
    history2 = model.fit(
        train_gen,
        epochs=CONFIG["epochs_phase2"],
        validation_data=val_gen,
        callbacks=callbacks_phase2,
        verbose=1
    )
    
    # Combine histories
    history = {
        'accuracy': history1.history['accuracy'] + history2.history['accuracy'],
        'val_accuracy': history1.history['val_accuracy'] + history2.history['val_accuracy'],
        'loss': history1.history['loss'] + history2.history['loss'],
        'val_loss': history1.history['val_loss'] + history2.history['val_loss']
    }
    
    return history

def plot_training_history(history):
    """Create and save training progress graphs."""
    
    print_header("Saving Training History")
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    # Accuracy plot
    ax1.plot(history['accuracy'], label='Training Accuracy', linewidth=2)
    ax1.plot(history['val_accuracy'], label='Validation Accuracy', linewidth=2)
    ax1.axvline(x=CONFIG["epochs_phase1"]-1, color='gray', linestyle='--', label='Fine-tuning Start')
    ax1.set_title('Model Accuracy', fontsize=14)
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Loss plot
    ax2.plot(history['loss'], label='Training Loss', linewidth=2)
    ax2.plot(history['val_loss'], label='Validation Loss', linewidth=2)
    ax2.axvline(x=CONFIG["epochs_phase1"]-1, color='gray', linestyle='--', label='Fine-tuning Start')
    ax2.set_title('Model Loss', fontsize=14)
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('training_history.png', dpi=150)
    print("Saved: training_history.png")
    
    # Print final metrics
    print()
    print("Final Results:")
    print(f"  Training Accuracy:   {history['accuracy'][-1]:.2%}")
    print(f"  Validation Accuracy: {history['val_accuracy'][-1]:.2%}")

def save_model(model, class_indices):
    """Save the model in multiple formats."""
    
    print_header("Saving Model")
    
    # Save as TensorFlow SavedModel
    print(f"Saving TensorFlow SavedModel to: {CONFIG['saved_model_dir']}/")
    model.save(CONFIG['saved_model_dir'])
    
    # Convert and save as TensorFlow.js
    print(f"Converting to TensorFlow.js format: {CONFIG['output_dir']}/")
    tfjs.converters.save_keras_model(model, CONFIG['output_dir'])
    
    # Save class indices for reference
    class_info = {
        "classes": {v: k for k, v in class_indices.items()},
        "input_shape": [224, 224, 3],
        "created": datetime.now().isoformat(),
        "config": CONFIG
    }
    
    with open(os.path.join(CONFIG['output_dir'], 'class_info.json'), 'w') as f:
        json.dump(class_info, f, indent=2)
    
    print()
    print("Model saved successfully!")
    print()
    print("Files created:")
    for root, dirs, files in os.walk(CONFIG['output_dir']):
        for file in files:
            filepath = os.path.join(root, file)
            size = os.path.getsize(filepath)
            print(f"  {filepath} ({size:,} bytes)")

def main():
    """Main training pipeline."""
    
    print()
    print("╔════════════════════════════════════════════════════════════╗")
    print("║     AI Model Thumbnail Classifier - Training Script        ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print()
    
    # Check for GPU
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"✓ GPU detected: {gpus[0].name}")
        print("  Training will be faster!")
    else:
        print("✗ No GPU detected. Training will use CPU (slower).")
    print()
    
    # Check dataset exists
    if not os.path.exists(CONFIG["dataset_path"]):
        print(f"ERROR: Dataset folder not found: {CONFIG['dataset_path']}")
        print("Please create the dataset folder with ai_generated/ and human_created/ subfolders.")
        return
    
    # Create data generators
    train_gen, val_gen = create_data_generators()
    
    if train_gen.samples < 100:
        print()
        print("WARNING: Very few training samples detected!")
        print("For best results, aim for 500+ images per class.")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            return
    
    # Build model
    num_classes = len(train_gen.class_indices)
    model, base_model = build_model(num_classes)
    
    # Train
    history = train_model(model, base_model, train_gen, val_gen)
    
    # Plot training history
    plot_training_history(history)
    
    # Save model
    save_model(model, train_gen.class_indices)
    
    print_header("Training Complete!")
    print("Next steps:")
    print("1. Check training_history.png to see how training went")
    print("2. Upload the tfjs_model/ folder to a web server")
    print("3. Update the userscript with your model URL")
    print()
    print("See the deployment guide for detailed instructions.")

if __name__ == "__main__":
    main()
