import { Link } from 'react-router-dom'

function PortalHomePage() {
	return (
		<div>
			<h1>Cổng thông tin</h1>
			<Link to="/login">Login</Link>
		</div>
	)
}

export default PortalHomePage