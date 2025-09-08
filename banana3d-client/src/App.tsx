import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { ModelViewer } from './components/ModelViewer';
import './App.css';

// Updated states for a clearer flow
type AppState = 'selection' | 'uploaded' | 'generating-views' | 'views-generated' | 'generating-model' | 'finished';

type GeneratedViews = {
  front?: string;
  back?: string;
  left?: string;
};

const SERVER_URL = "http://127.0.0.1:5500"

function App() {

  const [appState, setAppState] = useState<AppState>('selection');

  // State to hold the selected image file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | undefined>(undefined);

  const [generatedViews, setGeneratedViews] = useState<GeneratedViews>({});

  // State to store the URL of the generated .glb model
  const [modelUrl, setModelUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Use useRef to hold interval IDs to prevent re-renders from affecting them
  const pollingIntervalRef = useRef<number | null>(null);
  const pollingTimeoutRef = useRef<number | null>(null);

  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  };

  const fetchGeneratedViews = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/generated-views`, {method: 'GET'});
      const data = await response.json();

      if (response.ok && data.status === 'complete') {
        console.log("Polling successful: Views are ready!");
        clearPolling();
        setGeneratedViews(data.views);
        setAppState('views-generated');
      } else {
        // Log pending status, but do nothing, the interval will try again
        console.log("Polling: Views are still pending...");
      }
    } catch (err) {
      console.error("Polling request failed:", err);
      clearPolling();
      setError("Failed to fetch generated views. Please try again.");
      setAppState('uploaded'); // Go back to the previous step
    }
  };

  const startPollingForViews = () => {
    clearPolling(); // Clear any previous polls before starting a new one

    // Set an interval to call fetchGeneratedViews every 2 seconds
    pollingIntervalRef.current = window.setInterval(fetchGeneratedViews, 2000);

    // Set a timeout to stop polling after 2 minutes (120,000 ms)
    pollingTimeoutRef.current = window.setTimeout(() => {
      console.error("Polling timed out after 2 minutes.");
      clearPolling();
      setError("Generation timed out. Please try again.");
      setAppState('uploaded'); // Go back to the previous step
    }, 120000);
  };

  // Step 1:
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create a temporary URL from the File object to display it in an <img> tag
      const imageUrl = URL.createObjectURL(file);
      setSourceImageUrl(imageUrl);
      setAppState('uploaded');

      setError(null); // Clear any previous errors
    }
  };

  // Step 2:
  const handleGenerateViews = async () => {
    if (!selectedFile) {
      setError("Source image is missing.");
      return;
    }
    setAppState('generating-views');
    setError(null);
    setGeneratedViews({}); // Clear previous views

    const formData = new FormData();
    formData.append('source_image', selectedFile);

    try {
      const response = await fetch(`${SERVER_URL}/generate-views`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate views');
      }

      const data = await response.json();
      console.log(data.message); // "Successfully started..."

      startPollingForViews();
      setAppState('views-generated');

    } catch (err: any) {
      console.error("Failed to generate views:", err);
      setError(err.message);
      setAppState('uploaded'); // Go back a step on error
    }
  };

  const getGeneratedViews = async () => {
    startPollingForViews();
    setAppState('views-generated');
  }

  // Step 3
  const handleGenerateModel = async () => {
    console.log("Generating 3D model...");
    setAppState('generating-model');
    
    const response = await fetch(`${SERVER_URL}/generate-model`, { method: 'GET' });
    const data = await response.json();

    if (response.ok && data.model_url) {
      console.log("Model URL received:", data.model_url);
      setModelUrl(data.model_url);
      setAppState('finished');
    }
  };

  // Effect to clean up the created object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (sourceImageUrl) URL.revokeObjectURL(sourceImageUrl);
      if (modelUrl) URL.revokeObjectURL(modelUrl);
      // Clean up generated view URLs too
      Object.values(generatedViews).forEach(URL.revokeObjectURL);
      clearPolling();
    };
  }, [sourceImageUrl, modelUrl, generatedViews]);
  
  const handleReset = () => {
    setAppState('selection');
    setSelectedFile(null);
    setSourceImageUrl(undefined);
    setGeneratedViews({});
    setModelUrl("");
    setError(null);
    clearPolling();
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Nano Banana enhanced Image to 3D Model</h1>
        {error && <p className="error-message">{error}</p>}
      </header>
      
      <div className="steps-container">
      {/* Step 1: File Selection */}
        <div className="step">
          <h2>Step 1: Select Source</h2>
          <p>Select the source image</p>
          <input 
            type="file" 
            id="image-upload"
            accept="image/png, image/jpeg" 
            onChange={handleFileChange}
          />
          <div className="image-preview-container">
            {sourceImageUrl ? (
            <img 
              src={sourceImageUrl} 
              alt="Source Preview" 
              className="source-preview-image" 
            />) : (
              <span>Preview</span>
            )}
          </div>
          {appState !== 'selection' && (
            <button onClick={handleReset} className="reset-button">Reset</button>
          )}
        </div>

        {/* Step 2: Generate Views with nano banana */}
        <div className="step">
          <h2>Step 2: Generate Views</h2>
          <p>Generate orthographic views using nano banana</p>
          <button 
            onClick={handleGenerateViews} 
            disabled={!sourceImageUrl || appState === 'generating-views'}
          >
            Generate Views
          </button>
          <button className="hidden" onClick={getGeneratedViews}>Get Views</button>
          <div className="views-grid">
            {(['front', 'back', 'left'] as const).map(view => (
              <div className="view-row-item" key={view} >
                <div>{view.charAt(0).toUpperCase() + view.slice(1)} View</div>
                <div className="image-preview-container">
                  {appState === 'generating-views' && <div className="spinner"></div>}
                  {generatedViews[view] && <img src={generatedViews[view]} alt={`${view} view`} className="source-preview-image" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Generate 3D model */}
        <div className="step">  
          <h2>Step 3: Generate Model</h2>
          <p>Generate textured GLB model with Hunyuan 2.0 via Fal.ai</p>
          <button 
            onClick={handleGenerateModel}
            disabled={appState !== 'views-generated'}
          >
            Generate Model
          </button>
            {appState === 'generating-model' ? (
              <div className="canvas-container">
                <div className="spinner" />
              </div>
            ) : appState === 'finished' ? (
              <div className="canvas-container">
                <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }} shadows>
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[3.3, 1.0, 4.4]} intensity={Math.PI * 2} castShadow />
                  <ModelViewer url={modelUrl} position={[0, 0, 0]} castShadow />
                  <Environment preset="city" />
                  <OrbitControls />
                </Canvas>
                <a href={modelUrl}>Download Model</a>
              </div>
            ) : (
              <div className="canvas-container">
                <span>Generated model preview area</span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default App;