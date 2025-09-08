import os
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
from IPython.display import display

from dotenv import load_dotenv
load_dotenv()
API_KEY = os.environ.get("GEMINI_API_KEY")

# Configure the client with your API key
client = genai.Client(api_key=API_KEY)

# The text prompt for image generation
prompts = [
    "Create front view of the character from the source image for 3D modeling. Ensure the character is centered and in a T-pose, on a plain white background.",
    "Create back view of the character from the provided images for 3D modeling. Ensure the character is centered and in a T-pose, on a plain white background.",
    "Create left view of the character from the provided images for 3D modeling. Ensure the character is centered and in a T-pose, on a plain white background.",
    #"Create right view of the character from the provided images for 3D modeling. Ensure the character is centered and in a T-pose, on a plain white background."
]

# Filenames for saving each generated image
filenames = [
    "generated_front_view.png",
    "generated_back_view.png",
    "generated_left_view.png",
    #"generated_right_view.png"
]

def generate_character_views(source_image_pil: Image.Image) -> dict[str, bytes]:

    # This list will store the generated images to provide context for the next request
    image_context = []

    # --- Generation Loop ---
    for i, prompt in enumerate(prompts):
        view_name = filenames[i].split('_')[1] # Extracts 'front', 'back', etc.
        print(f"Generating {view_name} view...")

        # The contents for the API call will include the prompt, the original source image,
        # and all images generated in previous steps.
        contents = [prompt, source_image_pil] + image_context

        # Call the API to generate the image
        response = client.models.generate_content(
            model="gemini-2.5-flash-image-preview",
            contents=contents,
            config=types.GenerateContentConfig(
            top_k=1, # max choices for model to choose from
            temperature=0.7,
        ),
        )

        # Extract the binary image data from the response
        image_parts = [
            part.inline_data.data
            for part in response.candidates[0].content.parts
            if part.inline_data
        ]
        
        # Save and store the new image
        if image_parts:
            # Convert binary data to a PIL Image
            new_image = Image.open(BytesIO(image_parts[0]))
            
            # Save the image to a file
            new_image.save(f"./generated-images/{filenames[i]}")
            print(f"Saved '{filenames[i]}'")
            display(new_image)
            
            # Add the newly generated image to our context list for the next iteration
            image_context.append(new_image)
        else:
            print(f"Could not generate {view_name} view. No image data received.")

print("\nAll views have been generated.")