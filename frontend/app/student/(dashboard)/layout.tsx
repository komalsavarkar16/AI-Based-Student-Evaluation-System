import StudentNavbar from "../components/StudentNavbar/StudentNavbar";

export default function layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <StudentNavbar />
            {children}
        </>
    )
}