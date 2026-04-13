import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Force the project ID from config to match the ID token's audience
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log('Firebase Admin initialized with project ID:', firebaseConfig.projectId);
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export async function POST(req: Request) {
  try {
    const { targetUid, newPassword, adminToken } = await req.json();

    if (!targetUid || !newPassword || !adminToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the admin token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(adminToken);
    } catch (authError: any) {
      console.error('Error verifying admin token:', authError);
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
    }
    
    const adminUid = decodedToken.uid;
    const adminEmail = decodedToken.email;

    // Hardcoded admin check first (bypasses Firestore if it's a known admin)
    const isHardcodedAdmin = adminEmail === 'saviomurillomaia@gmail.com' || 
                            adminEmail === 'admin@crmfeedback.com';

    if (!isHardcodedAdmin) {
      // If not hardcoded, check Firestore
      try {
        const db = getFirestore(firebaseConfig.firestoreDatabaseId);
        const adminDoc = await db.collection('users').doc(adminUid).get();
        const adminData = adminDoc.data();

        if (!adminData || adminData.role !== 'admin') {
          return NextResponse.json({ error: 'Unauthorized: Only admins can change passwords' }, { status: 403 });
        }
      } catch (dbError: any) {
        console.error('Error fetching admin doc from Firestore:', dbError);
        // If Firestore check fails but user is not hardcoded admin, we must deny
        return NextResponse.json({ error: 'Unauthorized: Could not verify admin status' }, { status: 403 });
      }
    }

    // Update the user's password
    try {
      await admin.auth().updateUser(targetUid, {
        password: newPassword,
      });
      console.log(`Password updated for user ${targetUid} by admin ${adminUid}`);
    } catch (updateError: any) {
      console.error('Error updating user password in Auth:', updateError);
      return NextResponse.json({ error: 'Failed to update password in Auth service' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Global error in update-password route:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}
