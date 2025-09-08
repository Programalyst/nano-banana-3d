import { useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';

// ThreeElements['primitive'] is a type that represents the props for a primitive object in react-three-fiber
type ModelViewerProps = Omit<ThreeElements['primitive'], 'object'> & {
  url: string;
};

export const ModelViewer = (props: ModelViewerProps) => {
  // 3. --- Destructure the url from props ---
  const { url, ...restProps } = props;

  // 4. --- Pass the dynamic `url` to the useGLTF hook ---
  const { scene } = useGLTF(url);

  // 5. --- Spread the remaining props onto the primitive ---
  return <primitive object={scene} {...restProps} />;
}