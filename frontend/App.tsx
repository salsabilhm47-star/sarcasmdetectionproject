import {
    FaHome,
    FaRobot,
    FaTachometerAlt,
    FaUser,
    FaSignInAlt,
    FaSignOutAlt,
    FaSmileWink,
    FaBalanceScale,
    FaBrain
} from "react-icons/fa";

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { AnalysisProvider } from "./context/AnalysisContext";
import Chatbot from "./pages/Chatbot";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import Profile from "./pages/Profile";

import logo from "./assets/logonv.png";

import "./App.css";

function Navbar() {
    const location = useLocation();
    const isAuthenticated = localStorage.getItem("access_token") !== null;
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        localStorage.removeItem("chat_sessions");
        window.location.href = "/";
    };

    if (location.pathname === "/login") return null;

    return (
        <nav className="navbar">
            <div className="nav-logo">
                <img src={logo} alt="logo" className="logo-img" />
            </div>

            <div className="nav-links">
                <Link to="/" className={`nav-btn ${location.pathname === "/" ? "active" : ""}`}>
                    <FaHome /> الرئيسية
                </Link>
                <Link to="/chatbot" className={`nav-btn ${location.pathname === "/chatbot" ? "active" : ""}`}>
                    <FaRobot /> المحادثة
                </Link>
                <Link to="/dashboard" className={`nav-btn ${location.pathname === "/dashboard" ? "active" : ""}`}>
                    <FaTachometerAlt /> لوحة التحكم
                </Link>
                {isAuthenticated ? (
                    <>
                        <Link to="/profile" className={`nav-btn ${location.pathname === "/profile" ? "active" : ""}`}>
                            <FaUser /> {user?.fullName?.split(" ")[0] || "حسابي"}
                        </Link>
                        <button onClick={handleLogout} className="nav-btn logout-btn">
                            <FaSignOutAlt /> تسجيل خروج
                        </button>
                    </>
                ) : (
                    <Link to="/login" className={`nav-btn ${location.pathname === "/login" ? "active" : ""}`}>
                        <FaSignInAlt /> تسجيل الدخول
                    </Link>
                )}
            </div>
        </nav>
    );
}

function Home() {
    return (
        <div className="page home-container">

            <div className="hero-logo">
                <img src={logo} alt="logo" className="hero-logo-img" />
                <div className="logo-sub">SYSTÈME D'ANALYSE INTELLIGENTE</div>
                <div className="logo-tagline">نظام تحليل السخرية والتهكم والمفارقة</div>
            </div>

            <div className="divider" />

            <h1>نظام تحليل السخرية<br />والتهكم والمفارقة</h1>
            <p className="subtitle">تحليل ذكي للمحتوى العربي</p>

            <p className="description">
                منصة تفاعلية تعتمد على الذكاء الاصطناعي والتعلم العميق، متخصصة في تحليل النصوص العربية
                لاكتشاف السخرية، التهكم، المفارقة،  في اللغة العربية.
            </p>

            <div className="buttons">
                <Link to="/chatbot" className="btn btn-primary"> <FaSmileWink /> تحليل النصوص</Link>
                <Link to="/dashboard" className="btn btn-secondary"> <FaBalanceScale /> لوحة التحكم</Link>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-num">96%</div>
                    <div className="stat-label">دقة التحليل</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num">4</div>
                    <div className="stat-label">فئات التصنيف</div>
                </div>
                <div className="stat-card">
                    <div className="stat-num">
                        <FaBrain />
                    </div>
                    <div className="stat-label">ذكاء اصطناعي</div>
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <AnalysisProvider>
            <Router>
                <Navbar />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/chatbot" element={<Chatbot />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </Router>
        </AnalysisProvider>
    );
}

export default App;