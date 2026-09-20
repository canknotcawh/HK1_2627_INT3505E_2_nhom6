import { Button } from "../components/ui/button"
import { useNavigate } from "react-router-dom"

export default function Login() {
    const navigate = useNavigate()

    return (
        <div>
            Page Login
            <Button
                onClick={() => navigate("/")}
            >
                Login
            </Button>
        </div>
    )
}