import Navbar from "../components/Navbar/Navbar";
export default function layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Navbar />
            {children}
        </>
    );
}
