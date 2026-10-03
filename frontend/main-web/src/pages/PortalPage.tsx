import NavBar from '../components/layouts/NavBar'
import BigSection from '../components/sections/BigSection'
import StatsSection from '../components/sections/StatsSection'
import FeaturesSection from '../components/sections/FeaturesSection'

export default function HomePage() {
    return (
        <main>
            <NavBar />
            <BigSection />
            <StatsSection />
            <FeaturesSection />
        </main>
    )
}