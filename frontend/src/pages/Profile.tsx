import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Phone, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import axios from "axios";

// Types
interface LoginData {
    email: string;
    password: string;
    rememberMe: boolean;
}

interface RegisterData {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
}

interface Alert {
    show: boolean;
    type: string;
    message: string;
}

interface LoginResponse {
    success: boolean;
    access_token?: string;
    refresh_token?: string;
    message?: string;
    user?: {
        full_name: string;
        phone?: string;
    };
}

interface RegisterResponse {
    success: boolean;
    message?: string;
}

export default function AuthPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"login" | "register">("login");
    const [loading, setLoading] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [alert, setAlert] = useState<Alert>({ show: false, type: "", message: "" });

    // Login state
    const [loginData, setLoginData] = useState<LoginData>({
        email: "",
        password: "",
        rememberMe: false
    });

    // Register state
    const [registerData, setRegisterData] = useState<RegisterData>({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });

    // Password strength
    const [passwordStrength, setPasswordStrength] = useState<string>("");

    // Show alert helper
    const showAlert = (type: string, message: string): void => {
        setAlert({ show: true, type, message });
        setTimeout(() => setAlert({ show: false, type: "", message: "" }), 5000);
    };

    // Check password strength
    const checkPasswordStrength = (password: string): void => {
        if (password.length === 0) {
            setPasswordStrength("");
            return;
        }
        if (password.length < 6) {
            setPasswordStrength("weak");
        } else if (password.length < 10) {
            setPasswordStrength("medium");
        } else {
            setPasswordStrength("strong");
        }
    };

    // Handle login input change
    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value, type, checked } = e.target;
        setLoginData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    // Handle register input change
    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        setRegisterData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === "password") {
            checkPasswordStrength(value);
        }
    };

    // Handle login submit
    const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!loginData.email || !loginData.password) {
            showAlert("error", "يرجى إدخال البريد الإلكتروني وكلمة المرور");
            return;
        }

        setLoading(true);

        try {
            console.log("🔐 Attempting login...");

            const response = await axios.post<LoginResponse>("http://127.0.0.1:8000/api/login/", {
                email: loginData.email,
                password: loginData.password
            });

            console.log("📥 Login response:", response.data);

            if (response.data.success && response.data.access_token) {
                // Save tokens
                localStorage.setItem("access_token", response.data.access_token);

                if (response.data.refresh_token) {
                    localStorage.setItem("refresh_token", response.data.refresh_token);
                }

                // Save user info
                if (response.data.user) {
                    localStorage.setItem("user", JSON.stringify({
                        fullName: response.data.user.full_name,
                        email: loginData.email,
                        phone: response.data.user.phone || ""
                    }));
                }

                showAlert("success", `مرحباً ${response.data.user?.full_name || loginData.email}!`);

                // Redirect after short delay
                setTimeout(() => {
                    navigate("/");
                }, 1500);

            } else {
                showAlert("error", response.data.message || "فشل تسجيل الدخول");
            }

        } catch (error: unknown) {
            console.error("❌ Login error:", error);

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    showAlert("error", "البريد الإلكتروني أو كلمة المرور غير صحيحة");
                } else if (error.request) {
                    showAlert("error", "تعذر الاتصال بالخادم. تأكد من تشغيل الخادم الخلفي");
                } else {
                    showAlert("error", `خطأ: ${error.message}`);
                }
            } else {
                showAlert("error", "حدث خطأ غير متوقع");
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle register submit
    const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        // Validation
        if (!registerData.fullName || !registerData.email || !registerData.password) {
            showAlert("error", "يرجى ملء جميع الحقول المطلوبة");
            return;
        }

        if (registerData.password !== registerData.confirmPassword) {
            showAlert("error", "كلمتا المرور غير متطابقتين");
            return;
        }

        if (registerData.password.length < 8) {
            showAlert("error", "كلمة المرور يجب أن تكون 8 أحرف على الأقل");
            return;
        }

        setLoading(true);

        try {
            console.log("📝 Attempting registration...");

            const response = await axios.post<RegisterResponse>("http://127.0.0.1:8000/api/register/", {
                name: registerData.fullName,
                email: registerData.email,
                phone: registerData.phone,
                password: registerData.password
            });

            console.log("📥 Register response:", response.data);

            if (response.data.success) {
                showAlert("success", "تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...");

                // Auto login after registration
                setTimeout(async () => {
                    try {
                        const loginResponse = await axios.post<LoginResponse>("http://127.0.0.1:8000/api/login/", {
                            email: registerData.email,
                            password: registerData.password
                        });

                        if (loginResponse.data.success && loginResponse.data.access_token) {
                            localStorage.setItem("access_token", loginResponse.data.access_token);
                            if (loginResponse.data.refresh_token) {
                                localStorage.setItem("refresh_token", loginResponse.data.refresh_token);
                            }
                            if (loginResponse.data.user) {
                                localStorage.setItem("user", JSON.stringify({
                                    fullName: loginResponse.data.user.full_name,
                                    email: registerData.email,
                                    phone: loginResponse.data.user.phone || ""
                                }));
                            }
                            navigate("/");
                        }
                    } catch (error) {
                        setActiveTab("login");
                        showAlert("info", "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول");
                    }
                }, 2000);

            } else {
                showAlert("error", response.data.message || "فشل إنشاء الحساب");
            }

        } catch (error: unknown) {
            console.error("❌ Registration error:", error);

            if (axios.isAxiosError(error)) {
                if (error.response?.data?.message) {
                    showAlert("error", error.response.data.message);
                } else if (error.request) {
                    showAlert("error", "تعذر الاتصال بالخادم");
                } else {
                    showAlert("error", `خطأ: ${error.message}`);
                }
            } else {
                showAlert("error", "حدث خطأ غير متوقع");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page auth-page">
            <div className="auth-container">
                {/* Logo Section */}
                <div className="auth-logo-section">
                    <div className="auth-logo-icon">
                        🤖
                    </div>
                    <div className="auth-logo-text">نورالذكاء</div>
                    <p className="auth-subtitle">منصة الذكاء الاصطناعي المتقدمة</p>
                </div>

                {/* Alert Message */}
                {alert.show && (
                    <div className={`auth-alert ${alert.type}`}>
                        {alert.type === "error" && <AlertCircle />}
                        {alert.type === "success" && <CheckCircle />}
                        {alert.type === "info" && <AlertCircle />}
                        <span>{alert.message}</span>
                    </div>
                )}

                {/* Tabs */}
                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
                        onClick={() => setActiveTab("login")}
                        disabled={loading}
                    >
                        <span>تسجيل الدخول</span>
                    </button>
                    <button
                        className={`auth-tab ${activeTab === "register" ? "active" : ""}`}
                        onClick={() => setActiveTab("register")}
                        disabled={loading}
                    >
                        <span>إنشاء حساب</span>
                    </button>
                </div>

                {/* Login Form */}
                {activeTab === "login" && (
                    <form className="auth-form" onSubmit={handleLoginSubmit}>
                        <div className="form-group">
                            <label>
                                <Mail size={16} />
                                البريد الإلكتروني
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    placeholder="admin@example.com"
                                    value={loginData.email}
                                    onChange={handleLoginChange}
                                    disabled={loading}
                                    required
                                />
                                <Mail className="input-icon" size={18} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>
                                <Lock size={16} />
                                كلمة المرور
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={loginData.password}
                                    onChange={handleLoginChange}
                                    disabled={loading}
                                    required
                                />
                                <Lock className="input-icon" size={18} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="password-toggle"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-options">
                            <label className="checkbox-wrapper">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={loginData.rememberMe}
                                    onChange={handleLoginChange}
                                />
                                <span>تذكرني</span>
                            </label>
                            <a href="#" className="forgot-link">نسيت كلمة المرور؟</a>
                        </div>

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="spinner"></div>
                                    <span>جاري تسجيل الدخول...</span>
                                </>
                            ) : (
                                <span>تسجيل الدخول</span>
                            )}
                        </button>
                    </form>
                )}

                {/* Register Form */}
                {activeTab === "register" && (
                    <form className="auth-form" onSubmit={handleRegisterSubmit}>
                        <div className="form-group">
                            <label>
                                <User size={16} />
                                الاسم الكامل *
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    name="fullName"
                                    className="form-input"
                                    placeholder="أحمد محمد"
                                    value={registerData.fullName}
                                    onChange={handleRegisterChange}
                                    disabled={loading}
                                    required
                                />
                                <User className="input-icon" size={18} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>
                                <Mail size={16} />
                                البريد الإلكتروني *
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    placeholder="example@email.com"
                                    value={registerData.email}
                                    onChange={handleRegisterChange}
                                    disabled={loading}
                                    required
                                />
                                <Mail className="input-icon" size={18} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>
                                <Phone size={16} />
                                رقم الهاتف
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type="tel"
                                    name="phone"
                                    className="form-input"
                                    placeholder="+966 50 123 4567"
                                    value={registerData.phone}
                                    onChange={handleRegisterChange}
                                    disabled={loading}
                                />
                                <Phone className="input-icon" size={18} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>
                                <Lock size={16} />
                                كلمة المرور *
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    className="form-input"
                                    placeholder="8 أحرف على الأقل"
                                    value={registerData.password}
                                    onChange={handleRegisterChange}
                                    disabled={loading}
                                    required
                                />
                                <Lock className="input-icon" size={18} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="password-toggle"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {passwordStrength && (
                                <div className="password-strength">
                                    <div className="strength-bar">
                                        <div className={`strength-fill ${passwordStrength}`}></div>
                                    </div>
                                    <span className="strength-text">
                                        قوة كلمة المرور: {
                                        passwordStrength === "weak" ? "ضعيفة" :
                                            passwordStrength === "medium" ? "متوسطة" :
                                                "قوية"
                                    }
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>
                                <Lock size={16} />
                                تأكيد كلمة المرور *
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    className="form-input"
                                    placeholder="أعد إدخال كلمة المرور"
                                    value={registerData.confirmPassword}
                                    onChange={handleRegisterChange}
                                    disabled={loading}
                                    required
                                />
                                <Lock className="input-icon" size={18} />
                            </div>
                        </div>

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="spinner"></div>
                                    <span>جاري إنشاء الحساب...</span>
                                </>
                            ) : (
                                <span>إنشاء حساب جديد</span>
                            )}
                        </button>
                    </form>
                )}

                {/* Footer */}
                <div className="auth-footer">
                    <p className="auth-footer-text">
                        {activeTab === "login" ? (
                            <>
                                ليس لديك حساب؟{" "}
                                <button
                                    className="auth-footer-link"
                                    onClick={() => setActiveTab("register")}
                                >
                                    إنشاء حساب جديد
                                </button>
                            </>
                        ) : (
                            <>
                                لديك حساب بالفعل؟{" "}
                                <button
                                    className="auth-footer-link"
                                    onClick={() => setActiveTab("login")}
                                >
                                    تسجيل الدخول
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}