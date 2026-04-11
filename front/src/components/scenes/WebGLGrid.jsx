import { useEffect, useRef } from "react";
import { initGridScene } from "../../lib/webgl/gridScene";

export default function WebGLGrid() {
	const sceneInstanceRef = useRef(null);
	const isInitializedRef = useRef(false);

	useEffect(() => {
		const container = document.getElementById("grid-background");
		if (!container || isInitializedRef.current) return;

		const instance = initGridScene(container);
		if (instance) {
			sceneInstanceRef.current = instance;
			isInitializedRef.current = true;
		}

		return () => {
			if (sceneInstanceRef.current) {
				sceneInstanceRef.current.cleanup();
				sceneInstanceRef.current = null;
				isInitializedRef.current = false;
			}
		};
	}, []);

	return (
		<div
			id="grid-background"
			style={{
				position: "fixed",
				inset: 0,
				zIndex: -1,
				pointerEvents: "none",
			}}
		/>
	);
}
