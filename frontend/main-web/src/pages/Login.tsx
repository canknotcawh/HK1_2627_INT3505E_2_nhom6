import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"

export default function Login() {
    const navigate = useNavigate();
    return (
        <div>
            Portal Login
            <div>
                <Button
                    onClick={() => {
                        navigate("/user")
                    }}
                >
                    Login
                </Button>
            </div>
        </div>
    )
}