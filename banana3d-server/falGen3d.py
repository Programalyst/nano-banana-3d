import asyncio
import fal_client
import os
from dotenv import load_dotenv
from fal_client.client import FalClientError

load_dotenv()
FAL_KEY = os.environ.get("FAL_KEY")

test_image_paths = {
    "front": "./generated-images/generated_front_view.png",
    "back": "./generated-images/generated_back_view.png",
    "left": "./generated-images/generated_left_view.png"
}

async def generate_3d_model_from_views(view_image_paths: dict[str, str]) -> str:

    try:
        # --- Upload the three required images to Fal's storage in parallel ---
        print("Uploading view images to Fal AI storage...")
        upload_tasks = [
            fal_client.upload_file_async(view_image_paths["front"]),
            fal_client.upload_file_async(view_image_paths["back"]),
            fal_client.upload_file_async(view_image_paths["left"]),
        ]
        # asyncio.gather runs all awaitable tasks concurrently
        front_url, back_url, left_url = await asyncio.gather(*upload_tasks)
        print("Images uploaded successfully.")

        handler = await fal_client.submit_async(
            "fal-ai/hunyuan3d/v2/multi-view",
            arguments = {
                "front_image_url": front_url,
                "back_image_url": back_url,
                "left_image_url": left_url,
                "seed": 17880,
                "num_inference_steps": 50,
                "guidance_scale": 7.5,
                "octree_resolution": 256,
                "textured_mesh": True,
            },
        )

        #async for event in handler.iter_events(with_logs=True):
        #    print(event)

        result = await handler.get()

        model_mesh_data = result.get('model_mesh')
        if model_mesh_data and isinstance(model_mesh_data, dict):
            
            model_url = model_mesh_data.get('url')
            if model_url:
                print(f"Successfully extracted 3D model URL: {model_url}")
                return model_url

    except FalClientError as e:
        print(f"A Fal Client error occurred: {e}")
        raise # Re-raise the exception so the Flask endpoint can catch it and send a 500 error


'''
response example:
{
    "model_mesh": {
        "url": "https: //v3.fal.media/files/zebraYZHl4fZKM8fTdOdpcPO1s_multiview_mesh-1757235495.glb",
        "content_type": "application/octet-stream",
        "file_name": "multiview_mesh-1757235495.glb",
        "file_size": 3726408
    },
    "seed": 17880
}
'''

if __name__ == "__main__":
    asyncio.run(generate_3d_model_from_views(test_image_paths))