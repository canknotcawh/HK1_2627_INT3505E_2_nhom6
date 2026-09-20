import { StrictMode } from 'react'
import { RouterProvider } from "react-router-dom";
import router from "./routes"


export default function App() {
  return (
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
  );
}