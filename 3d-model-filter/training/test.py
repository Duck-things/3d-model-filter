# test.py - test the trained model on images
# run with: python test.py image.jpg
# or: python test.py folder/

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import sys
import numpy as np
from tensorflow import keras
from tensorflow.keras.preprocessing import image

MODEL_PATH = 'trained_model/model.keras'
IMG_SIZE = 224

def load_model():
    if not os.path.exists(MODEL_PATH):
        alt = 'trained_model/model.h5'
        if os.path.exists(alt):
            return keras.models.load_model(alt)
        print(f'ERROR: Model not found. Run train.py first.')
        exit(1)
    return keras.models.load_model(MODEL_PATH)

def predict_single(model, img_path):
    try:
        img = image.load_img(img_path, target_size=(IMG_SIZE, IMG_SIZE))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = img_array / 255.0
        
        predictions = model.predict(img_array, verbose=0)
        ai_prob = predictions[0][0]
        human_prob = predictions[0][1]
        
        return ai_prob, human_prob
    except Exception as e:
        print(f'Error processing {img_path}: {e}')
        return None, None

def main():
    if len(sys.argv) < 2:
        print('Usage: python test.py image.jpg')
        print('   or: python test.py folder/')
        return
    
    path = sys.argv[1]
    model = load_model()
    
    if os.path.isfile(path):
        # single image
        ai_prob, human_prob = predict_single(model, path)
        if ai_prob is not None:
            print(f'\nImage: {path}')
            print(f'AI-generated: {ai_prob*100:.1f}%')
            print(f'Human-created: {human_prob*100:.1f}%')
            
            if ai_prob > 0.6:
                print('Verdict: Likely AI-generated')
            elif human_prob > 0.6:
                print('Verdict: Likely human-created')
            else:
                print('Verdict: Uncertain')
    
    elif os.path.isdir(path):
        # folder of images
        results = {'ai': 0, 'human': 0, 'uncertain': 0}
        files = [f for f in os.listdir(path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        
        print(f'Testing {len(files)} images in {path}...\n')
        
        for f in files:
            img_path = os.path.join(path, f)
            ai_prob, human_prob = predict_single(model, img_path)
            
            if ai_prob is None:
                continue
            
            if ai_prob > 0.6:
                verdict = 'AI'
                results['ai'] += 1
            elif human_prob > 0.6:
                verdict = 'Human'
                results['human'] += 1
            else:
                verdict = '???'
                results['uncertain'] += 1
            
            print(f'{f}: {verdict} (AI:{ai_prob*100:.0f}%)')
        
        print(f'\nSummary:')
        print(f'  AI-generated: {results["ai"]}')
        print(f'  Human-created: {results["human"]}')
        print(f'  Uncertain: {results["uncertain"]}')
    
    else:
        print(f'ERROR: {path} not found')

if __name__ == '__main__':
    main()
