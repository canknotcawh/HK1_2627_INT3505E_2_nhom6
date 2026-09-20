import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"

export default function HomePage() {
    const navigate = useNavigate();
    return (
        <div>
            THIS IS HOME PAGE OF PORTAL
            <div>
                <Button
                    onClick={() => {
                        navigate("/login")
                    }}
                >
                    Login
                </Button>
            </div>
        </div>
    )
}