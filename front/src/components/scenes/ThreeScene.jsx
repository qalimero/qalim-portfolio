import { useEffect, useRef, useState } from "react";
import { initSplineScene } from "../../lib/three/initSplineScene";

export default function ThreeScene() {
	const sceneInstanceRef = useRef(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const isInitializedRef = useRef(false);

	useEffect(() => {
		const initScene = async () => {
			// Prevent multiple initializations
			if (isInitializedRef.current) {
				return;
			}

			try {
				setIsLoading(true);
				setError(null);

				const instance = initSplineScene("three-container");
				if (instance) {
					sceneInstanceRef.current = instance;
					isInitializedRef.current = true;
					setIsLoading(false);
				} else {
					throw new Error("Failed to initialize Three.js scene");
				}
			} catch (err) {
				setError(err.message);
				setIsLoading(false);
			}
		};

		// Add a small delay to ensure the container is mounted
		const timer = setTimeout(initScene, 100);

		// Cleanup on unmount
		return () => {
			clearTimeout(timer);
			if (sceneInstanceRef.current) {
				sceneInstanceRef.current.cleanup();
				sceneInstanceRef.current = null;
				isInitializedRef.current = false;
			}
		};
	}, []);

	return (
		<div
			id="three-container"
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{isLoading && (
				<div
					style={{
						color: "white",
						fontSize: "14px",
						opacity: 0.7,
						pointerEvents: "none",
					}}
				>
					Loading 3D scene...
				</div>
			)}
			{error && (
				<div
					style={{
						color: "#ff6b6b",
						fontSize: "14px",
						textAlign: "center",
						padding: "20px",
						pointerEvents: "none",
					}}
				>
					Failed to load 3D scene: {error}
				</div>
			)}
		</div>
	);
}
