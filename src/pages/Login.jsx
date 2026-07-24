import React, { useState } from "react";

import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

const Login = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const navigate = useNavigate();

  // Default sign-in values for demo purposes
  const [signinemail, setsigninEmail] = useState("test07@gmail.com");
  const [signinpassword, setsigninPassword] = useState("test0987");

  const [form, setForm] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Eye toggle states
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showConfirmPasswordField, setShowConfirmPasswordField] = useState(false);
  const [showSigninPasswordField, setShowSigninPasswordField] = useState(false);

  // Tab switcher for form view
  const switchToSigninForm = () => {
    setForm(2);
    setError("");
  };
  const switchToSignupForm = () => {
    setForm(1);
    setError("");
    setSuccess("");
  };

  // ─── Firebase Sign In ───
  const handleSignin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!signinemail.trim() || !signinpassword.trim()) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      // 1. Authenticate first so request.auth != null
      const userCredential = await signInWithEmailAndPassword(
        auth,
        signinemail,
        signinpassword
      );
      const user = userCredential.user;

      // 2. Only then read Firestore (rules require auth)
      const sanitizedEmail = signinemail.replace(/\./g, "_");
      const docRef = doc(db, "users", sanitizedEmail);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setError("User profile not found.");
        setLoading(false);
        return;
      }

      const userData = docSnap.data();

      // Construct a token payload for RBAC
      const payload = {
        role: userData.role || "Member",
        companyCode:
          userData.companyCode ||
          userData.uid ||
          user.uid ||
          sanitizedEmail,
        email: signinemail,
        id: user.uid,
        name: userData.name || user.displayName || "",
      };

      const token = `offline.${btoa(JSON.stringify(payload))}.signature`;

      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (err) {
      console.error("Firebase sign-in failed:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-email"
      ) {
        setError("Incorrect email or password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(err.message || "Authentication error.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Firebase Sign Up ───
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim() ||
      !mobile.trim()
    ) {
      setError("Please fill all fields before signing up.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Save user details to Cloud Firestore
      const sanitizedEmail = email.replace(/\./g, "_");
      await setDoc(doc(db, "users", sanitizedEmail), {
        uid: user.uid,
        name,
        email,
        mobile,
        role: "Member",
        designation: "",
        parentuid: [],
        childrenuid: [],
        projectIds: [],
        createdAt: new Date().toISOString(),
      });

      // Success
      setSuccess("Account created successfully! Please sign in.");
      setError("");
      switchToSigninForm();
    } catch (err) {
      console.error("Firebase sign-up failed:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (pwd) => {
    return pwd.length < 8 || pwd === email || !/[0-9!@#$%^&*]/.test(pwd);
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setShowPasswordRules(validatePassword(value));
  };

  // Spinner component
  const Spinner = () => (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .circle-spinner {
          width: 18px;
          height: 18px;
          border: 3px solid #ffffff66;
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>
      <div className="circle-spinner" />
    </>
  );

  // Eye icon SVG
  const EyeIcon = ({ open }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[#26203B]"
    >
      {open ? (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );

  return (
    <div className="flex h-[100vh]">
      {/* Left Side - Image */}
      <div className="hidden md:flex h-screen w-[50%] items-center justify-center py-4">
        <div
          className="bg-cover bg-center w-[80%] h-full rounded-4xl flex flex-col justify-between p-4 mr-16"
          style={{ backgroundImage: "url('/imagelogo.jpg')" }}
        >
          {/* Top Content */}
          <div className="flex flex-col items-center justify-center pt-6 text-center">
            <div className="text-white text-5xl md:text-5xl font-bold leading-tight">
              WELCOME TO TASKFLEET
            </div>
            <div className="text-white text-base md:text-2xl pt-2">
              Your Gateway to Effortless Management
            </div>
          </div>

          {/* Bottom Content */}
          <div className="flex flex-col items-center justify-center pb-6 text-center">
            <div className="text-white text-xl md:text-4xl font-semibold">
              Seamless Collaboration
            </div>
            <div className="text-white text-sm md:text-xl pt-4">
              Effortless work together with your
            </div>
            <div className="text-white text-sm md:text-xl pb-4">
              team in real time.
            </div>
            <div className="text-white text-xl md:text-3xl font-bold">...</div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="hidden md:flex w-[50%] h-screen items-center justify-center p-6">
        {/* Signup form */}
        {form === 1 && (
          <div className="w-full max-w-sm">
            <h1 className="text-[#26203B] text-2xl font-bold mb-6">
              TaskFleet
            </h1>

            {/* Tab Switcher */}
            <div className="flex mb-6 rounded-xl p-1 bg-gray-200">
              <button className="flex-1 py-2 text-xs text-white bg-[#20A4F3] rounded-xl">
                Sign Up
              </button>
              <button
                type="button"
                onClick={switchToSigninForm}
                className="flex-1 py-2 text-xs text-gray-600 rounded-xl hover:bg-gray-100 transition"
              >
                Sign In
              </button>
            </div>

            {/* Form */}
            <form className="space-y-2" onSubmit={handleSignup}>
              {/* Name */}
              <div>
                <label className="block mb-1 font-medium text-xs text-[#26203B]">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Full Name"
                  className="w-full h-[48px] px-3 py-2 border border-[#a192dd] rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              {/* Email */}
              <div>
                <label className="block mb-1 font-medium text-xs text-[#26203B]">
                  Email Id
                </label>
                <input
                  type="email"
                  placeholder="Enter Email"
                  className="w-full h-[48px] px-3 py-2 border border-[#a192dd] rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block mb-1 font-medium text-xs text-[#26203B]">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswordField ? "text" : "password"}
                    placeholder="Enter Password"
                    className="w-full h-[48px] px-3 py-2 pr-10 border border-[#a192dd] rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPasswordField((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#26203B] hover:text-blue-600 focus:outline-none"
                    aria-label={showPasswordField ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showPasswordField} />
                  </button>
                </div>
              </div>

              {/* Password Rules */}
              {showPasswordRules && (
                <ul className="text-xs text-gray-500 pl-4 list-disc">
                  <li>Password Strength: Weak</li>
                  <li>Cannot contain your name or email address</li>
                  <li>At least 8 characters</li>
                  <li>Contains a number or symbol</li>
                </ul>
              )}

              {/* Confirm Password */}
              <div>
                <label className="block mb-1 font-medium text-xs text-[#26203B]">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPasswordField ? "text" : "password"}
                    placeholder="Re-enter Password"
                    className="w-full h-[48px] px-3 py-2 pr-10 border border-[#a192dd] rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPasswordField((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#26203B] hover:text-blue-600 focus:outline-none"
                    aria-label={showConfirmPasswordField ? "Hide confirm password" : "Show confirm password"}
                  >
                    <EyeIcon open={showConfirmPasswordField} />
                  </button>
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block mb-1 font-medium text-xs text-[#26203B]">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="Enter Mobile Number"
                  className="w-full h-[48px] px-3 py-2 border border-[#a192dd] rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>

              <div
                className="text-xs text-[#736e88] flex justify-end cursor-pointer hover:underline"
                onClick={() => navigate("/orgsetup")}
              >
                Company?
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-xs">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#20A4F3] text-white py-2 rounded hover:bg-blue-600 transition text-xs mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Creating...</span>
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

              {/* OR Divider */}
              <div className="my-4 text-center text-xs text-[#9C9AA5]">OR</div>

              {/* Social Buttons */}
              <div className="flex flex-row gap-3">
                <div className="flex-1 p-2 flex items-center justify-center border border-[#a192dd] rounded-xl hover:bg-gray-50 cursor-pointer">
                  <img
                    src="https://img.icons8.com/color/48/google-logo.png"
                    alt="Google"
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex-1 p-2 flex items-center justify-center border border-[#a192dd] rounded-xl hover:bg-gray-50 cursor-pointer">
                  <img
                    src="https://img.icons8.com/?size=100&id=30840&format=png&color=000000"
                    alt="Apple"
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex-1 p-2 flex items-center justify-center border border-[#a192dd] rounded-xl hover:bg-gray-50 cursor-pointer">
                  <img
                    src="https://img.icons8.com/color/48/windows-logo.png"
                    alt="Microsoft"
                    className="w-5 h-5"
                  />
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-center text-gray-600 mt-4">
                By signing up to create an account I accept Company's
                <br />
                <span className="text-black">
                  Terms of use &amp; Privacy Policy
                </span>
              </p>
            </form>
          </div>
        )}

        {/* Sign In form */}
        {form === 2 && (
          <div className="w-full max-w-sm">
            <h1 className="text-[#26203B] text-2xl font-bold mb-6">
              TaskFleet
            </h1>
            <div className="flex mb-6 rounded-xl p-1 bg-gray-200">
              <button
                type="button"
                onClick={switchToSignupForm}
                className="flex-1 py-2 text-xs text-gray-600 hover:bg-gray-100 transition rounded-xl"
              >
                Sign Up
              </button>
              <button
                type="button"
                className="flex-1 py-2 text-xs text-white bg-[#20A4F3] rounded-xl"
              >
                Sign In
              </button>
            </div>

            {/* Sign In Form */}
            <form className="space-y-4" onSubmit={handleSignin}>
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-3 py-2 rounded text-xs mb-2">
                  {success}
                </div>
              )}
              <div>
                <label className="block mb-1 font-medium text-xs text-[#26203B]">
                  Email Id
                </label>
                <input
                  type="email"
                  placeholder="Enter Email"
                  className="w-full h-[48px] px-3 py-2 border border-[#a192dd] rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={signinemail}
                  onChange={(e) => setsigninEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-xs text-[#26203B]">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showSigninPasswordField ? "text" : "password"}
                    placeholder="Enter Password"
                    className="w-full h-[48px] px-3 py-2 pr-10 border border-[#a192dd] rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={signinpassword}
                    onChange={(e) => setsigninPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowSigninPasswordField((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#26203B] hover:text-blue-600 focus:outline-none"
                    aria-label={showSigninPasswordField ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showSigninPasswordField} />
                  </button>
                </div>
              </div>

              <div className="text-xs text-[#736e88] flex justify-end">
                Forgot Password?
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#20A4F3] text-white py-2 rounded hover:bg-blue-600 transition text-xs mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Logging in...</span>
                  </>
                ) : (
                  "Login"
                )}
              </button>

              <div className="my-4 text-center text-xs text-[#9C9AA5]">OR</div>

              {/* Social Login Buttons */}
              <div className="flex flex-row gap-3">
                <div className="flex-1 p-2 flex items-center justify-center border border-[#a192dd] rounded-xl hover:bg-gray-50 cursor-pointer">
                  <img
                    src="https://img.icons8.com/color/48/google-logo.png"
                    alt="Google"
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex-1 p-2 flex items-center justify-center border border-[#a192dd] rounded-xl hover:bg-gray-50 cursor-pointer">
                  <img
                    src="https://img.icons8.com/?size=100&id=30840&format=png&color=000000"
                    alt="Apple"
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex-1 p-2 flex items-center justify-center border border-[#a192dd] rounded-xl hover:bg-gray-50 cursor-pointer">
                  <img
                    src="https://img.icons8.com/color/48/windows-logo.png"
                    alt="Microsoft"
                    className="w-5 h-5"
                  />
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
