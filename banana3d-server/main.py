# main.py
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from PIL import Image
from pathlib import Path
from utils import to_data_url
from bananaGen import generate_character_views
from falGen3d import generate_3d_model_from_views

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
SOURCE_IMAGES_DIR = BASE_DIR / "source-images"
GENERATED_VIEWS_DIR = BASE_DIR / "generated-images"
SOURCE_IMAGES_DIR.mkdir(exist_ok=True)
GENERATED_VIEWS_DIR.mkdir(exist_ok=True)

required_files = {
    "front": GENERATED_VIEWS_DIR / "generated_front_view.png",
    "back": GENERATED_VIEWS_DIR / "generated_back_view.png",
    "left": GENERATED_VIEWS_DIR / "generated_left_view.png",
}

# --- Endpoints for Step 2 ---
@app.route('/generate-views', methods=['POST'])
def generate_views():
    if 'source_image' not in request.files:
        return jsonify({"error": "No image part in the request"}), 400

    file = request.files['source_image']
    if not file:
        return jsonify({"error": "No image selected for uploading"}), 400

    try:
        source_image_pil = Image.open(file.stream)
        source_image_pil.save("./source-images/source-image.png")  # Save the uploaded image for processing

        generate_character_views(source_image_pil)

        return jsonify("Successfully generated character views.")

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/generated-views', methods=['GET'])
def get_generated_views():
    try:
        if not all(f.exists() for f in required_files.values()):
            return jsonify({"status": "pending", "message": "Generation in progress..."}), 202

        views = {}
        for view_name, file_path in required_files.items():
            image_bytes = file_path.read_bytes()
            views[view_name] = to_data_url(image_bytes)

        print("All views found and readable. Sending to client.")
        return jsonify({"status": "complete", "views": views})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# --- Endpoints for Step 3 ---
@app.route('/generate-model', methods=['GET'])
async def generate_model():
    try:
        if not all(f.exists() for f in required_files.values()):
            return jsonify({"status": "pending", "message": "Generate views first."}), 424
        
        model_url = await generate_3d_model_from_views(required_files)
        return jsonify({ "model_url": model_url })

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500

# The ASGI server will run the app
# hypercorn main:app --reload --bind 127.0.0.1:5500
'''
if __name__ == '__main__':
    # Runs the Flask app on http://127.0.0.1:5500
    app.run(debug=True, port=5500)
'''
