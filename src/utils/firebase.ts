import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import config from '../../firebase-applet-config.json';
import { BoardState, Player, MoveStep } from '../types/backgammon';

const app = getApps().length === 0 ? initializeApp(config) : getApp();

// Named database support as provisioned in config.firestoreDatabaseId
export const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Authenticate anonymously for seamless multiplayer
export async function ensureAuth(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (err) {
    console.warn('Anonymous auth warning, continuing with local ID:', err);
    return `usr_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Connection test
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection offline, check network.');
    }
  }
}
testConnection();

export interface OnlineRoomData {
  roomId: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  updatedAt: number;
  whitePlayer: { id: string; name: string; connected: boolean };
  blackPlayer: { id: string; name: string; connected: boolean } | null;
  board: BoardState;
  currentPlayer: Player;
  whiteDice: number[];
  whiteDiceRemaining: number[];
  blackDice: number[];
  blackDiceRemaining: number[];
  dice?: number[];
  diceRemaining?: number[];
  isRolling?: boolean;
  rollId?: number;
  rollingPlayer?: Player | null;
  hasRolled: boolean;
  statusMessage: string;
  winner: Player | null;
  winType: 'normal' | 'gammon' | 'backgammon' | null;
  lastMove?: MoveStep | null;
  lastMoveTimestamp?: number;
  lastMovePlayer?: Player | null;
}

// Generate human-friendly 5-letter room code (e.g. "BG492")
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = 'BG';
  for (let i = 0; i < 3; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

// Create a new online multiplayer room
export async function createOnlineRoom(
  hostName: string,
  initialBoard: BoardState
): Promise<{ roomId: string; room: OnlineRoomData }> {
  const userId = await ensureAuth();
  const roomId = generateRoomCode();
  const roomRef = doc(db, 'game_rooms', roomId);

  const roomData: OnlineRoomData = {
    roomId,
    status: 'waiting',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    whitePlayer: {
      id: userId,
      name: hostName || 'Spieler 1',
      connected: true,
    },
    blackPlayer: null,
    board: initialBoard,
    currentPlayer: 'white',
    whiteDice: [],
    whiteDiceRemaining: [],
    blackDice: [],
    blackDiceRemaining: [],
    hasRolled: false,
    statusMessage: `Raum ${roomId} erstellt. Warte auf Mitspieler...`,
    winner: null,
    winType: null,
  };

  await setDoc(roomRef, roomData);
  return { roomId, room: roomData };
}

// Join an existing room
export async function joinOnlineRoom(
  roomId: string,
  playerName: string
): Promise<{ success: boolean; role: 'white' | 'black' | 'spectator'; room?: OnlineRoomData; error?: string }> {
  const cleanId = roomId.trim().toUpperCase();
  const userId = await ensureAuth();
  const roomRef = doc(db, 'game_rooms', cleanId);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    return { success: false, role: 'spectator', error: 'Raum nicht gefunden. Bitte Code prüfen!' };
  }

  const room = snap.data() as OnlineRoomData;

  // If user is already white player
  if (room.whitePlayer.id === userId) {
    return { success: true, role: 'white', room };
  }

  // If user is already black player
  if (room.blackPlayer && room.blackPlayer.id === userId) {
    return { success: true, role: 'black', room };
  }

  // If black slot is empty, claim it and start game!
  if (!room.blackPlayer) {
    const updatedBlack = {
      id: userId,
      name: playerName || 'Spieler 2',
      connected: true,
    };
    await updateDoc(roomRef, {
      blackPlayer: updatedBlack,
      status: 'playing',
      statusMessage: `${updatedBlack.name} ist beigetreten! ${room.whitePlayer.name} (Weiß) beginnt – bitte würfeln!`,
      updatedAt: Date.now(),
    });
    return {
      success: true,
      role: 'black',
      room: { ...room, blackPlayer: updatedBlack, status: 'playing' },
    };
  }

  // Otherwise join as spectator
  return { success: true, role: 'spectator', room };
}

// Listen to real-time room changes across devices
export function subscribeToOnlineRoom(
  roomId: string,
  onUpdate: (data: OnlineRoomData) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const cleanId = roomId.trim().toUpperCase();
  const roomRef = doc(db, 'game_rooms', cleanId);
  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as OnlineRoomData);
      }
    },
    (err) => {
      console.warn('Firestore room sync listener error:', err);
      if (onError) onError(err);
    }
  );
}

// Update game state in room
export async function updateOnlineRoomState(
  roomId: string,
  updates: Partial<OnlineRoomData>
): Promise<void> {
  const cleanId = roomId.trim().toUpperCase();
  const roomRef = doc(db, 'game_rooms', cleanId);
  await updateDoc(roomRef, {
    ...updates,
    updatedAt: Date.now(),
  });
}
