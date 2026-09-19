import { Link, Outlet } from 'react-router-dom'

function UserLayout() {
	return (
		<div>
			<nav>
				<Link to="profile">Profile</Link>
				<Link to="loans">Loans</Link>
				<Link to="ranking">Ranking</Link>
				<Link to="search">Search book</Link>
			</nav>
			<main>
				<Outlet />
			</main>
		</div>
	)
}

export default UserLayout