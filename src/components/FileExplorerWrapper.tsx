
import { auth } from "@/auth";
import { FileExplorer } from "@/components/FileExplorer";

export async function FileExplorerWrapper({ userId }: { userId: string }) {
    const session = await auth();

    if (!session?.user || session.user.id !== userId) {
        return null;
    }

    return <FileExplorer />;
}
