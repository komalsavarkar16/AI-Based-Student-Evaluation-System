function ProfileProgressBar({ progress }) {
    return (
        <div>
            <p>Profile Completion: {progress}%</p>

            <div style={{ width: "50%", background: "#e0e0e0", borderRadius: "5px", transition: "width 1s ease-in-out;" }}>
                <div
                    style={{
                        width: `${progress}%`,
                        height: "10px",
                        background: "linear-gradient(90deg, #6366f1, #a855f7)",
                        borderRadius: "5px",
                        transition: "width 0.3s ease",
                    }}
                />
            </div>
        </div>
    );
}

export default ProfileProgressBar;
