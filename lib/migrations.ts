import { db, handleFirestoreError, OperationType } from '@/firebase';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp, query, where } from 'firebase/firestore';

export interface Migration {
  id: string;
  name: string;
  description: string;
  run: (userId: string) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    id: '001_init_company',
    name: 'Inicializar Empresa',
    description: 'Cria as configurações padrão da empresa se não existirem.',
    run: async (userId: string) => {
      const docRef = doc(db, 'settings', 'company');
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          name: 'The Culinary Ledger',
          description: 'Edição Maître D\'',
          logoUrl: '',
          updatedAt: serverTimestamp(),
          updatedBy: userId
        });
      }
    }
  },
  {
    id: '002_init_admin_permissions',
    name: 'Permissões Administrativas',
    description: 'Garante que os administradores padrão tenham todas as permissões.',
    run: async (userId: string) => {
      // Logic to ensure admin permissions are correct
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'admin') {
          await setDoc(userDocRef, {
            ...userData,
            permissions: {
              canEdit: true,
              canDelete: true
            }
          }, { merge: true });
        }
      }
    }
  }
];

export async function getExecutedMigrations(): Promise<string[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'migrations'));
    return querySnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error fetching migrations:', error);
    return [];
  }
}

export async function runMigration(migration: Migration, userId: string) {
  try {
    console.log(`Running migration: ${migration.name}`);
    await migration.run(userId);
    
    await setDoc(doc(db, 'migrations', migration.id), {
      id: migration.id,
      name: migration.name,
      executedAt: serverTimestamp(),
      executedBy: userId
    });
    
    console.log(`Migration ${migration.id} completed successfully.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `migrations/${migration.id}`);
  }
}
