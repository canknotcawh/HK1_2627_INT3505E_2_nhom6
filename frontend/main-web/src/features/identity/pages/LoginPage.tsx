import { useNavigate } from 'react-router-dom'

const MOCK_USER_ID = 'demo'

function LoginPage() {
	const navigate = useNavigate()

	function handleLogin() {
		navigate(`/user/${MOCK_USER_ID}`)
	}

	return (
		<div>
			<h1>Màn hình đăng nhập</h1>
			<button type="button" onClick={handleLogin}>
				Login
			</button>
		</div>
	)
}

export default LoginPage