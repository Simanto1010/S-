import { db, auth } from "../firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, arrayUnion, onSnapshot } from "firebase/firestore";

export class TeamService {
  /**
   * S+ TEAM HUB - Workspace and RBAC System
   */
  static async createWorkspace(userId: string, name: string) {
    const workspaceRef = await addDoc(collection(db, "workspaces"), {
      name,
      ownerId: userId,
      members: [userId],
      roles: { [userId]: 'admin' },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return workspaceRef.id;
  }

  static async inviteMember(workspaceId: string, email: string, invitedBy: string) {
    const invitationRef = await addDoc(collection(db, "invitations"), {
      workspaceId,
      email,
      invitedBy,
      status: 'pending',
      role: 'editor',
      createdAt: serverTimestamp()
    });
    
    // Log Activity
    await this.logActivity(workspaceId, invitedBy, `Invited ${email} to the workspace.`);
    
    return invitationRef.id;
  }

  static async acceptInvitation(invitationId: string, userId: string) {
    const invitationDoc = doc(db, "invitations", invitationId);
    const invitationSnap = await getDocs(query(collection(db, "invitations"), where("__name__", "==", invitationId)));
    const invitationData = invitationSnap.docs[0].data();

    if (invitationData.status !== 'pending') return false;

    // Update Invitation
    await updateDoc(invitationDoc, { status: 'accepted', acceptedBy: userId });

    // Update Workspace
    const workspaceDoc = doc(db, "workspaces", invitationData.workspaceId);
    await updateDoc(workspaceDoc, {
      members: arrayUnion(userId),
      [`roles.${userId}`]: invitationData.role,
      updatedAt: serverTimestamp()
    });

    // Log Activity
    await this.logActivity(invitationData.workspaceId, userId, `Joined the workspace.`);

    return true;
  }

  static async logActivity(workspaceId: string, userId: string, action: string) {
    await addDoc(collection(db, "teamActivity"), {
      workspaceId,
      userId,
      action,
      timestamp: serverTimestamp()
    });
  }

  static subscribeToActivity(workspaceId: string, callback: (activities: any[]) => void) {
    const q = query(
      collection(db, "teamActivity"),
      where("workspaceId", "==", workspaceId)
    );
    return onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(activities.sort((a: any, b: any) => b.timestamp?.seconds - a.timestamp?.seconds));
    });
  }

  /**
   * RBAC Check: Collaborative Brain Mode
   * Only admins can approve strategic tasks.
   */
  static async checkPermission(workspaceId: string, userId: string, action: 'approve' | 'edit' | 'view') {
    const workspaceSnap = await getDocs(query(collection(db, "workspaces"), where("__name__", "==", workspaceId)));
    const workspaceData = workspaceSnap.docs[0].data();
    const role = workspaceData.roles[userId];

    if (role === 'admin') return true;
    if (role === 'editor' && (action === 'edit' || action === 'view')) return true;
    if (role === 'viewer' && action === 'view') return true;

    return false;
  }
}
