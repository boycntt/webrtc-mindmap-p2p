import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Terminal, 
  CheckCheck, 
  FileText, 
  Volume2, 
  VolumeX, 
  Layers,
  UserCheck,
  Compass,
  Settings,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Message Interface
interface ChatMessage {
  id: string;
  sender: 'local' | 'remote';
  text?: string;
  timestamp: string;
  reactions: { emoji: string; count: number; users: string[] }[];
  file?: {
    name: string;
    size: string;
    dataUrl: string;
    isImage: boolean;
  };
}

// Log Interface
interface ConsoleLog {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

// Discovered Peer Profile Interface
interface DiscoveredPeer {
  peerId: string;
  nickname: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  lat: number;
  lng: number;
  distance: number;
  lastActive: number;
}

const ChatP2PApp: React.FC = () => {
  // Modes: 'split' (User A & User B side-by-side) or 'tab' (Connected to another tab)
  const chatMode = 'tab';
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);

  // Split-screen Message Stores
  const [userAMessages, setUserAMessages] = useState<ChatMessage[]>([]);
  const [userBMessages, setUserBMessages] = useState<ChatMessage[]>([]);

  // Single panel Message Store (used in Cross-Tab mode, loaded from localStorage)
  const [tabMessages, setTabMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('p2p_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // User Profile States
  const [nickname, setNickname] = useState<string>(() => {
    const saved = localStorage.getItem('p2p_nickname');
    if (saved) return saved;
    const initial = 'Peer_' + Math.floor(100 + Math.random() * 900);
    localStorage.setItem('p2p_nickname', initial);
    return initial;
  });
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(() => {
    const saved = localStorage.getItem('p2p_gender');
    if (saved && (saved === 'male' || saved === 'female' || saved === 'other')) return saved as 'male' | 'female' | 'other';
    const genders: ('male' | 'female' | 'other')[] = ['male', 'female', 'other'];
    const initial = genders[Math.floor(Math.random() * genders.length)];
    localStorage.setItem('p2p_gender', initial);
    return initial;
  });
  const [age, setAge] = useState<number>(() => {
    const saved = localStorage.getItem('p2p_age');
    if (saved) return parseInt(saved, 10);
    const initial = Math.floor(18 + Math.random() * 32);
    localStorage.setItem('p2p_age', initial.toString());
    return initial;
  });

  // Match Preferences States
  const [preferredGender, setPreferredGender] = useState<'all' | 'male' | 'female' | 'other'>('all');
  const [maxDistance, setMaxDistance] = useState<number>(5000); // 5km by default
  const [minDistance, setMinDistance] = useState<number>(() => {
    const saved = localStorage.getItem('p2p_min_distance');
    return saved ? parseInt(saved, 10) : 200; // 200m by default
  });

  useEffect(() => {
    localStorage.setItem('p2p_min_distance', minDistance.toString());
  }, [minDistance]);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Geolocation States (Hanoi default base)
  const [latitude, setLatitude] = useState<number>(21.0285);
  const [longitude, setLongitude] = useState<number>(105.8542);
  const [locationOffset, setLocationOffset] = useState<number>(() => {
    // Randomize initial offset between 250m and 850m
    return Math.floor(250 + Math.random() * 600);
  });

  // Computed coordinates with simulated testing offset
  const computedLat = latitude + (locationOffset / 111111);
  const computedLng = longitude;

  // Discovered Nearby Peers
  const [discoveredPeers, setDiscoveredPeers] = useState<DiscoveredPeer[]>([]);

  // Setup tab switcher: 'nearby' | 'random' | 'room'
  const [matchingTab, setMatchingTab] = useState<'nearby' | 'random' | 'room'>('nearby');

  // Connection states
  const [isTabConnected, setIsTabConnected] = useState(false);
  const [tabRole, setTabRole] = useState<'initiator' | 'receiver' | null>(null);

  // WebRTC Multi-Tab Room and Random Match States
  const localPeerId = useRef<string>((() => {
    let id = localStorage.getItem('p2p_local_peer_id');
    if (!id) {
      id = 'peer_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('p2p_local_peer_id', id);
    }
    return id;
  })());
  const localTabId = useRef<string>('tab_' + Math.random().toString(36).substr(2, 9));
  const isMasterTab = useRef<boolean>(true);

  const [roomInput, setRoomInput] = useState('');
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [connectedPeerId, setConnectedPeerId] = useState<string | null>(null);
  const matchInterval = useRef<any>(null);

  // Refs to prevent stale closures in event listeners
  const joinedRoomRef = useRef<string | null>(null);
  const isMatchingRef = useRef(false);
  const isTabConnectedRef = useRef(false);
  const connectedPeerIdRef = useRef<string | null>(null);
  const tabRoleRef = useRef<'initiator' | 'receiver' | null>(null);
  const nicknameRef = useRef(nickname);
  const genderRef = useRef(gender);
  const ageRef = useRef(age);
  const preferredGenderRef = useRef(preferredGender);
  const maxDistanceRef = useRef(maxDistance);
  const minDistanceRef = useRef(minDistance);
  const computedLatRef = useRef(computedLat);
  const computedLngRef = useRef(computedLng);
  const discoveredPeersRef = useRef(discoveredPeers);

  useEffect(() => { joinedRoomRef.current = joinedRoom; }, [joinedRoom]);
  useEffect(() => { isMatchingRef.current = isMatching; }, [isMatching]);
  useEffect(() => { isTabConnectedRef.current = isTabConnected; }, [isTabConnected]);
  useEffect(() => { connectedPeerIdRef.current = connectedPeerId; }, [connectedPeerId]);
  useEffect(() => { tabRoleRef.current = tabRole; }, [tabRole]);
  useEffect(() => { nicknameRef.current = nickname; }, [nickname]);
  useEffect(() => { genderRef.current = gender; }, [gender]);
  useEffect(() => { ageRef.current = age; }, [age]);
  useEffect(() => { preferredGenderRef.current = preferredGender; }, [preferredGender]);
  useEffect(() => { maxDistanceRef.current = maxDistance; }, [maxDistance]);
  useEffect(() => { minDistanceRef.current = minDistance; }, [minDistance]);
  useEffect(() => { computedLatRef.current = computedLat; }, [computedLat]);
  useEffect(() => { computedLngRef.current = computedLng; }, [computedLng]);
  useEffect(() => { discoveredPeersRef.current = discoveredPeers; }, [discoveredPeers]);

  // Typing indicators
  const [isBTyping, setIsBTyping] = useState(false);
  const [isATyping, setIsATyping] = useState(false);
  const typingTimerA = useRef<any>(null);
  const typingTimerB = useRef<any>(null);

  // Reaction popover overlays
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);

  // Base64 chunk file transfer states
  const [fileTransferProgress, setFileTransferProgress] = useState<{
    name: string;
    progress: number;
    type: 'send' | 'receive';
  } | null>(null);

  // WebRTC References for Split Screen
  const pcA = useRef<RTCPeerConnection | null>(null);
  const pcB = useRef<RTCPeerConnection | null>(null);
  const dcA = useRef<RTCDataChannel | null>(null);
  const dcB = useRef<RTCDataChannel | null>(null);

  // WebRTC References for Multi-Tab
  const pcTab = useRef<RTCPeerConnection | null>(null);
  const dcTab = useRef<RTCDataChannel | null>(null);
  const broadcastChannel = useRef<BroadcastChannel | null>(null);

  // Scroll references
  const userAChatEndRef = useRef<HTMLDivElement>(null);
  const userBChatEndRef = useRef<HTMLDivElement>(null);

  // Audio synthethizer beep for message sound
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, audioCtx.currentTime); // Sound Frequency
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn("Audio Context beep block by browser sandbox rules.");
    }
  };

  // Add a console log entry
  const addLog = (type: 'info' | 'success' | 'warning' | 'error', text: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [
      { id: Math.random().toString(), time, type, text },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  // ---------------------------------------------------------------------------
  // WEBRTC SIGNALING & CONNECTIONS Setup
  // ---------------------------------------------------------------------------

  // Clean WebRTC connections
  const cleanupConnections = () => {
    if (pcA.current) pcA.current.close();
    if (pcB.current) pcB.current.close();
    if (pcTab.current) pcTab.current.close();
    
    pcA.current = null;
    pcB.current = null;
    pcTab.current = null;
    dcA.current = null;
    dcB.current = null;
    dcTab.current = null;

    setIsTabConnected(false);
    setTabRole(null);
  };

  // Setup Local Split-Screen WebRTC connection
  const setupSplitConnection = async () => {
    cleanupConnections();
    addLog('info', 'WebRTC: Khởi tạo kết nối Split-screen...');

    try {
      // 1. Create PeerConnections
      const peerA = new RTCPeerConnection();
      const peerB = new RTCPeerConnection();

      pcA.current = peerA;
      pcB.current = peerB;

      // 2. Create DataChannel on Peer A
      const channelA = peerA.createDataChannel('split-chat-channel', { ordered: true });
      dcA.current = channelA;

      // Setup Peer A Data Channel events
      channelA.onopen = () => {
        addLog('success', 'WebRTC DataChannel: Kênh A đã MỞ');
      };
      channelA.onclose = () => {
        addLog('warning', 'WebRTC DataChannel: Kênh A đã ĐÓNG');
      };
      channelA.onmessage = (e) => handleSplitChannelMessage(e, 'userB');

      // Setup Peer B Data Channel receiver
      peerB.ondatachannel = (e) => {
        const channelB = e.channel;
        dcB.current = channelB;
        addLog('success', 'WebRTC DataChannel: Kênh B đã Nhận & MỞ');
        
        channelB.onmessage = (e) => handleSplitChannelMessage(e, 'userA');
      };

      // 3. ICE Candidate Exchange
      peerA.onicecandidate = (e) => {
        if (e.candidate) {
          peerB.addIceCandidate(e.candidate).catch(err => console.error(err));
        }
      };
      peerB.onicecandidate = (e) => {
        if (e.candidate) {
          peerA.addIceCandidate(e.candidate).catch(err => console.error(err));
        }
      };

      // 4. SDP Offer / Answer Negotiating
      const offer = await peerA.createOffer();
      await peerA.setLocalDescription(offer);
      addLog('info', 'Signaling: Tạo SDP Offer cho Peer A');

      await peerB.setRemoteDescription(offer);
      const answer = await peerB.createAnswer();
      await peerB.setLocalDescription(answer);
      addLog('info', 'Signaling: Tạo SDP Answer cho Peer B');

      await peerA.setRemoteDescription(answer);
      addLog('success', 'WebRTC: Kết nối Split-screen hoàn tất thành công!');

      // Set initial Welcome message
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setUserAMessages([{
        id: 'welcome_a',
        sender: 'remote',
        text: 'Chào mừng! Kết nối P2P cục bộ đã được thiết lập. Hãy thử nhắn tin từ khung User B ở bên phải nhé!',
        timestamp: time,
        reactions: []
      }]);
      setUserBMessages([{
        id: 'welcome_b',
        sender: 'remote',
        text: 'Chào mừng! Kết nối P2P cục bộ đã được thiết lập. Hãy thử nhắn tin từ khung User A ở bên trái nhé!',
        timestamp: time,
        reactions: []
      }]);
    } catch (err: any) {
      addLog('error', `Lỗi kết nối WebRTC: ${err.message}`);
    }
  };

  const cleanupTabStateAndConnections = () => {
    cleanupConnections();
    setConnectedPeerId(null);
    setIsMatching(false);
    if (matchInterval.current) {
      clearInterval(matchInterval.current);
      matchInterval.current = null;
    }
    setTabMessages([]);
    setJoinedRoom(null);

    if (isMasterTab.current) {
      localStorage.removeItem('p2p_active_room_id');
      localStorage.removeItem('p2p_connected_peer_id');
      localStorage.removeItem('p2p_connected_peer_name');
      localStorage.removeItem('p2p_connected');
      localStorage.removeItem('p2p_messages');
    }
  };

  const handleJoinRoom = (roomIdToJoin: string) => {
    if (!roomIdToJoin.trim()) return;

    if (!isMasterTab.current) {
      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({
          type: 'JOIN_ROOM_FROM_SECONDARY',
          senderId: localTabId.current,
          senderPeerId: localPeerId.current,
          roomId: roomIdToJoin.trim().toLowerCase()
        });
      }
      return;
    }

    cleanupTabStateAndConnections();
    
    const cleanRoom = roomIdToJoin.trim().toLowerCase();
    setJoinedRoom(cleanRoom);
    addLog('info', `Room: Đã tham gia phòng [${cleanRoom}]. Đang quét tìm đối tác...`);

    // Broadcast JOIN event
    if (broadcastChannel.current) {
      broadcastChannel.current.postMessage({
        type: 'ROOM_JOIN',
        roomId: cleanRoom,
        senderId: localTabId.current,
        senderPeerId: localPeerId.current,
        senderNickname: nicknameRef.current
      });
    }
  };

  const handleStartRandomMatch = () => {
    if (!isMasterTab.current) {
      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({
          type: 'START_MATCH_FROM_SECONDARY',
          senderId: localTabId.current,
          senderPeerId: localPeerId.current
        });
      }
      return;
    }
    cleanupTabStateAndConnections();
    setIsMatching(true);
    addLog('info', 'Random Match: Bắt đầu dò tìm đối tác ngẫu nhiên...');
  };

  const handleLeaveOrDisconnect = () => {
    if (!isMasterTab.current) {
      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({
          type: 'DISCONNECT_FROM_TAB',
          senderId: localTabId.current,
          senderPeerId: localPeerId.current
        });
      }
      return;
    }

    if (broadcastChannel.current) {
      broadcastChannel.current.postMessage({
        type: 'DISCONNECT',
        senderId: localTabId.current,
        senderPeerId: localPeerId.current
      });
    }
    cleanupTabStateAndConnections();
    localStorage.removeItem('p2p_master_tab_id');
    addLog('info', 'Trạng thái: Đã ngắt kết nối và quay lại màn hình chờ.');
  };

  // Setup Multi-Tab BroadcastChannel & WebRTC
  const setupTabConnection = () => {
    cleanupConnections();
    
    // Create BroadcastChannel for signaling
    const channelName = 'sunhouse-chat-p2p-v2';
    const signaling = new BroadcastChannel(channelName);
    broadcastChannel.current = signaling;

    addLog('info', 'Signaling: Kênh định tuyến BroadcastChannel đã mở.');

    // Master election: Broadcast who is master
    isMasterTab.current = true;
    signaling.postMessage({
      type: 'WHO_IS_MASTER',
      senderId: localTabId.current,
      senderPeerId: localPeerId.current
    });

    setTimeout(() => {
      if (isMasterTab.current) {
        addLog('info', 'Master Elect: Tab này hoạt động ở chế độ Master chính.');
        localStorage.setItem('p2p_master_tab_id', localTabId.current);

        // Check auto-reconnect
        const savedRoom = localStorage.getItem('p2p_active_room_id');
        const savedPeer = localStorage.getItem('p2p_connected_peer_id');
        if (savedRoom && savedPeer) {
          addLog('info', `Auto-Reconnect: Phát hiện phiên cũ với [${savedPeer.substring(5, 10)}]. Đang liên hệ để kết nối lại...`);
          signaling.postMessage({
            type: 'RECONNECT_PING',
            senderId: localTabId.current,
            senderPeerId: localPeerId.current,
            senderNickname: nicknameRef.current,
            targetPeerId: savedPeer,
            roomId: savedRoom
          });
        }
      }
    }, 400);

    signaling.onmessage = async (e) => {
      const msg = e.data;
      if (!msg || !msg.type) return;

      // 1. Same Browser Sync
      if (msg.senderPeerId === localPeerId.current) {
        if (msg.senderId === localTabId.current) return;

        switch (msg.type) {
          case 'WHO_IS_MASTER':
            if (isMasterTab.current) {
              signaling.postMessage({
                type: 'SYNC_STATE',
                senderId: localTabId.current,
                senderPeerId: localPeerId.current,
                isTabConnected: isTabConnectedRef.current,
                joinedRoom: joinedRoomRef.current,
                connectedPeerId: connectedPeerIdRef.current,
                tabMessages: tabMessages,
                isMatching: isMatchingRef.current
              });
            }
            break;

          case 'SYNC_STATE':
            isMasterTab.current = false;
            setIsTabConnected(msg.isTabConnected);
            setJoinedRoom(msg.joinedRoom);
            setConnectedPeerId(msg.connectedPeerId);
            setTabMessages(msg.tabMessages);
            setIsMatching(msg.isMatching);
            break;

          case 'SEND_MSG_FROM_SECONDARY':
            if (isMasterTab.current) {
              sendMessage(msg.text, 'tab');
            }
            break;

          case 'TYPING_FROM_SECONDARY':
            if (isMasterTab.current) {
              sendTypingState(msg.isTyping, 'tab');
            }
            break;

          case 'REACTION_FROM_SECONDARY':
            if (isMasterTab.current) {
              sendReaction(msg.messageId, msg.emoji, 'tab');
            }
            break;

          case 'DISCONNECT_FROM_TAB':
            if (isMasterTab.current) {
              handleLeaveOrDisconnect();
            }
            break;

          case 'JOIN_ROOM_FROM_SECONDARY':
            if (isMasterTab.current) {
              handleJoinRoom(msg.roomId);
            }
            break;

          case 'START_MATCH_FROM_SECONDARY':
            if (isMasterTab.current) {
              handleStartRandomMatch();
            }
            break;

          case 'CONNECT_PEER_FROM_SECONDARY':
            if (isMasterTab.current) {
              handleConnectPeer(msg.peer);
            }
            break;
        }
        return;
      }

      // 2. Remote Peer Signaling
      if (msg.targetPeerId && msg.targetPeerId !== localPeerId.current) return;

      // Location Heartbeat
      if (msg.type === 'LOCATION_HEARTBEAT') {
        const peerLat = msg.lat;
        const peerLng = msg.lng;
        const dist = calculateDistance(computedLatRef.current, computedLngRef.current, peerLat, peerLng);
        
        if (dist < 200) {
          setDiscoveredPeers(prev => prev.filter(p => p.peerId !== msg.senderPeerId));
          return;
        }

        const newPeer: DiscoveredPeer = {
          peerId: msg.senderPeerId,
          nickname: msg.nickname,
          gender: msg.gender,
          age: msg.age,
          lat: peerLat,
          lng: peerLng,
          distance: dist,
          lastActive: Date.now()
        };

        setDiscoveredPeers(prev => {
          const filtered = prev.filter(p => p.peerId !== msg.senderPeerId);
          return [...filtered, newPeer];
        });
        return;
      }

      // Reconnect signaling
      if (msg.type === 'RECONNECT_PING') {
        if (!isTabConnectedRef.current && isMasterTab.current) {
          addLog('info', `Reconnect: Nhận yêu cầu kết nối lại từ [${msg.senderNickname || msg.senderPeerId.substring(5, 10)}]...`);
          signaling.postMessage({
            type: 'RECONNECT_ACK',
            senderId: localTabId.current,
            senderPeerId: localPeerId.current,
            targetPeerId: msg.senderPeerId,
            roomId: msg.roomId
          });
          setJoinedRoom(msg.roomId);
          setConnectedPeerId(msg.senderPeerId);
          if (localPeerId.current < msg.senderPeerId) {
            setTabRole('initiator');
            await initiateWebRTCTabConnection(msg.senderPeerId);
          } else {
            setTabRole('receiver');
          }
        }
        return;
      }

      if (msg.type === 'RECONNECT_ACK') {
        if (!isTabConnectedRef.current && isMasterTab.current) {
          addLog('success', 'Reconnect: Nhận tín hiệu đồng ý từ thiết bị cũ. Đang kết nối...');
          setJoinedRoom(msg.roomId);
          setConnectedPeerId(msg.senderPeerId);
          if (localPeerId.current < msg.senderPeerId) {
            setTabRole('initiator');
            await initiateWebRTCTabConnection(msg.senderPeerId);
          } else {
            setTabRole('receiver');
          }
        }
        return;
      }

      // Room JOIN
      if (msg.type === 'ROOM_JOIN') {
        const isTargetedMatch = msg.roomId.startsWith('match_');
        const matchesUs = isTargetedMatch && msg.roomId.includes(localPeerId.current);

        if (msg.roomId === joinedRoomRef.current || matchesUs) {
          if (!isTabConnectedRef.current && !connectedPeerIdRef.current && isMasterTab.current) {
            if (matchesUs && !joinedRoomRef.current) {
              setJoinedRoom(msg.roomId);
            }

            addLog('info', `Signaling: Phát hiện đối tác [${msg.senderNickname || msg.senderPeerId.substring(5, 10)}] tham gia cùng phòng. Phản hồi ACK...`);
            signaling.postMessage({
              type: 'ROOM_JOIN_ACK',
              roomId: msg.roomId,
              senderId: localTabId.current,
              senderPeerId: localPeerId.current,
              targetPeerId: msg.senderPeerId
            });
            setConnectedPeerId(msg.senderPeerId);
            
            if (localPeerId.current < msg.senderPeerId) {
              setTabRole('initiator');
              await initiateWebRTCTabConnection(msg.senderPeerId);
            } else {
              setTabRole('receiver');
            }
          }
        }
        return;
      }

      if (msg.type === 'ROOM_JOIN_ACK') {
        if (msg.roomId === joinedRoomRef.current && !isTabConnectedRef.current && !connectedPeerIdRef.current && isMasterTab.current) {
          addLog('success', `Signaling: Đối tác [${msg.senderNickname || msg.senderPeerId.substring(5, 10)}] đã phản hồi trong phòng.`);
          setConnectedPeerId(msg.senderPeerId);
          
          if (localPeerId.current < msg.senderPeerId) {
            setTabRole('initiator');
            await initiateWebRTCTabConnection(msg.senderPeerId);
          } else {
            setTabRole('receiver');
          }
        }
        return;
      }

      // WebRTC Negotiation
      switch (msg.type) {
        case 'SDP_OFFER':
          if (!isTabConnectedRef.current && isMasterTab.current) {
            setTabRole('receiver');
            addLog('info', 'Signaling: Đang xử lý SDP Offer...');
            await receiveWebRTCTabConnection(msg.senderPeerId, msg.sdp);
          }
          break;

        case 'SDP_ANSWER':
          if (pcTab.current && tabRoleRef.current === 'initiator' && isMasterTab.current) {
            addLog('info', 'Signaling: Đang áp dụng SDP Answer...');
            await pcTab.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            addLog('success', 'Signaling: Đã áp dụng cấu hình SDP Answer!');
          }
          break;

        case 'ICE_CANDIDATE':
          if (pcTab.current && isMasterTab.current) {
            try {
              await pcTab.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch (err) {
              console.error("Lỗi ICE candidate", err);
            }
          }
          break;

        case 'DISCONNECT':
          setDiscoveredPeers(prev => prev.filter(p => p.peerId !== msg.senderPeerId));
          if (msg.senderPeerId === connectedPeerIdRef.current) {
            addLog('warning', 'Signaling: Đối phương đã ngắt kết nối.');
            cleanupTabStateAndConnections();
          }
          break;
      }
    };
  };


  // Haversine Distance helper (returns distance in meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get matching candidate list filtered by preference
  const getFilteredCandidates = (): DiscoveredPeer[] => {
    return discoveredPeers.filter(peer => {
      // 1. Enforce minimum distance filter
      if (minDistance > 0 && peer.distance < minDistance) return false;

      // 2. Enforce maximum distance filter
      if (maxDistance !== -1 && peer.distance > maxDistance) return false;

      // 3. Enforce gender preferences
      if (preferredGender !== 'all' && peer.gender !== preferredGender) return false;

      return true;
    });
  };

  // Connect to a discovered peer directly
  const handleConnectPeer = async (peer: DiscoveredPeer) => {
    if (!isMasterTab.current) {
      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({
          type: 'CONNECT_PEER_FROM_SECONDARY',
          senderId: localTabId.current,
          senderPeerId: localPeerId.current,
          peer: peer
        });
      }
      return;
    }
    cleanupTabStateAndConnections();
    setConnectedPeerId(peer.peerId);
    addLog('info', `Kết nối: Đang liên kết trực tiếp tới [${peer.nickname}] (${peer.distance.toFixed(0)}m)...`);

    // Generate room ID and join
    const matchRoomId = 'match_' + [localPeerId.current, peer.peerId].sort().join('_');
    handleJoinRoom(matchRoomId);
  };

  // GPS Coordinates fetcher
  useEffect(() => {
    if (chatMode !== 'tab') return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          addLog('info', `Định vị: Đã cập nhật tọa độ GPS (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`);
        },
        (err) => {
          addLog('warning', `Định vị: Không thể đọc GPS (${err.message}). Sử dụng tọa độ mặc định.`);
        }
      );
    }
  }, [chatMode]);

  // Location Heartbeat Loop (updates coordinate changes immediately)
  useEffect(() => {
    if (chatMode !== 'tab') return;

    const interval = setInterval(() => {
      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({
          type: 'LOCATION_HEARTBEAT',
          senderId: localTabId.current,
          senderPeerId: localPeerId.current,
          nickname: nicknameRef.current,
          gender: genderRef.current,
          age: ageRef.current,
          lat: computedLatRef.current,
          lng: computedLngRef.current
        });
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [chatMode, computedLat, nickname, gender, age]);

  // Discovered Peers Pruning Effect
  useEffect(() => {
    if (chatMode !== 'tab') return;
    const interval = setInterval(() => {
      const now = Date.now();
      setDiscoveredPeers(prev => prev.filter(p => now - p.lastActive < 7000));
    }, 3000);
    return () => clearInterval(interval);
  }, [chatMode]);

  // Random Matching algorithm over filtered candidates
  useEffect(() => {
    if (!isMatching || isTabConnected || !isMasterTab.current) return;

    const interval = setInterval(() => {
      const candidates = getFilteredCandidates();
      if (candidates.length > 0) {
        // Pick one at random
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        addLog('success', `Random Match: Đã tìm thấy đối tác: [${chosen.nickname}] (${chosen.distance.toFixed(0)}m)`);
        
        setIsMatching(false);
        clearInterval(interval);
        
        // Generate deterministic room ID
        const matchRoomId = 'match_' + [localPeerId.current, chosen.peerId].sort().join('_');
        handleJoinRoom(matchRoomId);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isMatching, isTabConnected, discoveredPeers, preferredGender, maxDistance, minDistance]);

  // Initiator multi-tab WebRTC connection setup
  const initiateWebRTCTabConnection = async (peerId: string) => {
    try {
      const pc = new RTCPeerConnection();
      pcTab.current = pc;

      // Setup data channel
      const dc = pc.createDataChannel('tab-chat-channel', { ordered: true });
      dcTab.current = dc;

      dc.onopen = () => {
        setIsTabConnected(true);
        addLog('success', `WebRTC: Kênh dữ liệu P2P đã MỞ. Đã liên kết với [${peerId.substring(5, 10)}]!`);
        confetti({ particleCount: 50, spread: 45 });
      };

      dc.onclose = () => {
        setIsTabConnected(false);
        addLog('warning', 'WebRTC: Kết nối kênh dữ liệu P2P đã đóng.');
      };

      dc.onmessage = handleTabChannelMessage;

      // ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate && broadcastChannel.current) {
          broadcastChannel.current.postMessage({
            type: 'ICE_CANDIDATE',
            candidate: e.candidate,
            senderId: localTabId.current,
            senderPeerId: localPeerId.current,
            targetPeerId: peerId
          });
        }
      };

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      addLog('info', `Signaling: Đang gửi SDP Offer tới đối tác [${peerId.substring(5, 10)}]...`);
      
      broadcastChannel.current?.postMessage({
        type: 'SDP_OFFER',
        sdp: offer,
        senderId: localTabId.current,
        senderPeerId: localPeerId.current,
        targetPeerId: peerId
      });
    } catch (err: any) {
      addLog('error', `Lỗi kết nối Initiator: ${err.message}`);
    }
  };

  // Receiver multi-tab WebRTC connection setup
  const receiveWebRTCTabConnection = async (peerId: string, offerSDP: any) => {
    try {
      const pc = new RTCPeerConnection();
      pcTab.current = pc;

      pc.ondatachannel = (e) => {
        const dc = e.channel;
        dcTab.current = dc;

        dc.onopen = () => {
          setIsTabConnected(true);
          addLog('success', `WebRTC: Kênh dữ liệu P2P đã MỞ. Thiết lập P2P thành công với [${peerId.substring(5, 10)}]!`);
          confetti({ particleCount: 50, spread: 45 });
        };

        dc.onclose = () => {
          setIsTabConnected(false);
          addLog('warning', 'WebRTC: Kết nối P2P đã đóng.');
        };

        dc.onmessage = handleTabChannelMessage;
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && broadcastChannel.current) {
          broadcastChannel.current.postMessage({
            type: 'ICE_CANDIDATE',
            candidate: e.candidate,
            senderId: localTabId.current,
            senderPeerId: localPeerId.current,
            targetPeerId: peerId
          });
        }
      };

      // Set Remote Offer and Create Answer
      await pc.setRemoteDescription(new RTCSessionDescription(offerSDP));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      addLog('info', `Signaling: Gửi SDP Answer tới đối tác [${peerId.substring(5, 10)}]...`);
      broadcastChannel.current?.postMessage({
        type: 'SDP_ANSWER',
        sdp: answer,
        senderId: localTabId.current,
        senderPeerId: localPeerId.current,
        targetPeerId: peerId
      });
    } catch (err: any) {
      addLog('error', `Lỗi kết nối Receiver: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------------------
  // WEBRTC CHAT DATA CHANNELS MESSAGE HANDLERS
  // ---------------------------------------------------------------------------

  // Handle messages in split screen
  const handleSplitChannelMessage = (e: MessageEvent, receiverPanel: 'userA' | 'userB') => {
    const data = JSON.parse(e.data);
    
    if (data.type === 'typing') {
      if (receiverPanel === 'userA') {
        setIsBTyping(data.isTyping);
      } else {
        setIsATyping(data.isTyping);
      }
      return;
    }

    if (data.type === 'reaction') {
      const messageId = data.messageId;
      const emoji = data.emoji;
      
      const updateReactions = (prev: ChatMessage[]) => prev.map(msg => {
        if (msg.id === messageId) {
          const existing = msg.reactions.find(r => r.emoji === emoji);
          if (existing) {
            return {
              ...msg,
              reactions: msg.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r)
            };
          } else {
            return {
              ...msg,
              reactions: [...msg.reactions, { emoji, count: 1, users: ['peer'] }]
            };
          }
        }
        return msg;
      });

      if (receiverPanel === 'userA') {
        setUserAMessages(updateReactions);
      } else {
        setUserBMessages(updateReactions);
      }
      return;
    }

    // File transfer chunks assembly variables
    if (data.type === 'file-meta') {
      setFileTransferProgress({
        name: data.name,
        progress: 0,
        type: 'receive'
      });
      (window as any)[`file_buffer_${receiverPanel}`] = {
        name: data.name,
        size: data.size,
        total: data.total,
        chunks: [],
        isImage: data.isImage
      };
      return;
    }

    if (data.type === 'file-chunk') {
      const buffer = (window as any)[`file_buffer_${receiverPanel}`];
      if (buffer) {
        buffer.chunks[data.index] = data.chunk;
        const progressPercent = Math.round((buffer.chunks.filter(Boolean).length / buffer.total) * 100);
        
        setFileTransferProgress({
          name: buffer.name,
          progress: progressPercent,
          type: 'receive'
        });

        if (buffer.chunks.filter(Boolean).length === buffer.total) {
          // Assembled base64 file
          const assembledDataUrl = buffer.chunks.join('');
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newMsg: ChatMessage = {
            id: 'file_' + Math.random().toString(),
            sender: 'remote',
            timestamp: time,
            reactions: [],
            file: {
              name: buffer.name,
              size: buffer.size,
              dataUrl: assembledDataUrl,
              isImage: buffer.isImage
            }
          };

          if (receiverPanel === 'userA') {
            setUserAMessages(prev => [...prev, newMsg]);
          } else {
            setUserBMessages(prev => [...prev, newMsg]);
          }

          setFileTransferProgress(null);
          playNotificationSound();
          delete (window as any)[`file_buffer_${receiverPanel}`];
        }
      }
      return;
    }

    // Standard message
    if (data.type === 'text') {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMsg: ChatMessage = {
        id: data.id,
        sender: 'remote',
        text: data.text,
        timestamp: time,
        reactions: []
      };

      if (receiverPanel === 'userA') {
        setUserAMessages(prev => [...prev, newMsg]);
      } else {
        setUserBMessages(prev => [...prev, newMsg]);
      }
      
      playNotificationSound();
    }
  };

  // Handle messages in multi-tab mode
  const handleTabChannelMessage = (e: MessageEvent) => {
    const data = JSON.parse(e.data);

    if (data.type === 'typing') {
      setIsBTyping(data.isTyping);
      return;
    }

    if (data.type === 'reaction') {
      const messageId = data.messageId;
      const emoji = data.emoji;

      setTabMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const existing = msg.reactions.find(r => r.emoji === emoji);
          if (existing) {
            return {
              ...msg,
              reactions: msg.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r)
            };
          } else {
            return {
              ...msg,
              reactions: [...msg.reactions, { emoji, count: 1, users: ['peer'] }]
            };
          }
        }
        return msg;
      }));
      return;
    }

    if (data.type === 'file-meta') {
      setFileTransferProgress({
        name: data.name,
        progress: 0,
        type: 'receive'
      });
      (window as any).tab_file_buffer = {
        name: data.name,
        size: data.size,
        total: data.total,
        chunks: [],
        isImage: data.isImage
      };
      return;
    }

    if (data.type === 'file-chunk') {
      const buffer = (window as any).tab_file_buffer;
      if (buffer) {
        buffer.chunks[data.index] = data.chunk;
        const progressPercent = Math.round((buffer.chunks.filter(Boolean).length / buffer.total) * 100);
        
        setFileTransferProgress({
          name: buffer.name,
          progress: progressPercent,
          type: 'receive'
        });

        if (buffer.chunks.filter(Boolean).length === buffer.total) {
          const assembledDataUrl = buffer.chunks.join('');
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newMsg: ChatMessage = {
            id: 'file_' + Math.random().toString(),
            sender: 'remote',
            timestamp: time,
            reactions: [],
            file: {
              name: buffer.name,
              size: buffer.size,
              dataUrl: assembledDataUrl,
              isImage: buffer.isImage
            }
          };

          setTabMessages(prev => [...prev, newMsg]);
          setFileTransferProgress(null);
          playNotificationSound();
          delete (window as any).tab_file_buffer;
        }
      }
      return;
    }

    if (data.type === 'text') {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMsg: ChatMessage = {
        id: data.id,
        sender: 'remote',
        text: data.text,
        timestamp: time,
        reactions: []
      };

      setTabMessages(prev => [...prev, newMsg]);
      playNotificationSound();
    }
  };

  // Send message helper
  const sendMessage = (text: string, senderPanel: 'userA' | 'userB' | 'tab') => {
    if (!text.trim()) return;

    const messageId = 'msg_' + Math.random().toString(36).substr(2, 9);
    const payload = JSON.stringify({
      type: 'text',
      id: messageId,
      text: text
    });

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localMsg: ChatMessage = {
      id: messageId,
      sender: 'local',
      text: text,
      timestamp: time,
      reactions: []
    };

    if (senderPanel === 'userA') {
      if (dcA.current && dcA.current.readyState === 'open') {
        dcA.current.send(payload);
        setUserAMessages(prev => [...prev, localMsg]);
      } else {
        addLog('error', 'Kênh A chưa sẵn sàng gửi dữ liệu!');
      }
    } else if (senderPanel === 'userB') {
      if (dcB.current && dcB.current.readyState === 'open') {
        dcB.current.send(payload);
        setUserBMessages(prev => [...prev, localMsg]);
      } else {
        addLog('error', 'Kênh B chưa sẵn sàng gửi dữ liệu!');
      }
    } else {
      // Tab Mode
      if (isMasterTab.current) {
        if (dcTab.current && dcTab.current.readyState === 'open') {
          dcTab.current.send(payload);
          setTabMessages(prev => [...prev, localMsg]);
        } else {
          addLog('error', 'P2P data channel chưa mở!');
        }
      } else {
        // Forward to Master Tab
        broadcastChannel.current?.postMessage({
          type: 'SEND_MSG_FROM_SECONDARY',
          senderId: localTabId.current,
          senderPeerId: localPeerId.current,
          text: text
        });
      }
    }
  };

  // Send emoji reaction over WebRTC
  const sendReaction = (messageId: string, emoji: string, senderPanel: 'userA' | 'userB' | 'tab') => {
    const payload = JSON.stringify({
      type: 'reaction',
      messageId,
      emoji
    });

    const updateLocalReactions = (prev: ChatMessage[]) => prev.map(msg => {
      if (msg.id === messageId) {
        const existing = msg.reactions.find(r => r.emoji === emoji);
        if (existing) {
          return {
            ...msg,
            reactions: msg.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r)
          };
        } else {
          return {
            ...msg,
            reactions: [...msg.reactions, { emoji, count: 1, users: ['local'] }]
          };
        }
      }
      return msg;
    });

    if (senderPanel === 'userA' && dcA.current) {
      dcA.current.send(payload);
      setUserAMessages(updateLocalReactions);
    } else if (senderPanel === 'userB' && dcB.current) {
      dcB.current.send(payload);
      setUserBMessages(updateLocalReactions);
    } else if (senderPanel === 'tab') {
      if (isMasterTab.current) {
        if (dcTab.current) {
          dcTab.current.send(payload);
          setTabMessages(updateLocalReactions);
        }
      } else {
        broadcastChannel.current?.postMessage({
          type: 'REACTION_FROM_SECONDARY',
          senderId: localTabId.current,
          senderPeerId: localPeerId.current,
          messageId,
          emoji
        });
      }
    }
    
    setActiveReactionMsgId(null);
  };

  // Send typing state
  const sendTypingState = (isTyping: boolean, senderPanel: 'userA' | 'userB' | 'tab') => {
    const payload = JSON.stringify({ type: 'typing', isTyping });
    
    if (senderPanel === 'userA' && dcA.current && dcA.current.readyState === 'open') {
      dcA.current.send(payload);
    } else if (senderPanel === 'userB' && dcB.current && dcB.current.readyState === 'open') {
      dcB.current.send(payload);
    } else if (senderPanel === 'tab') {
      if (isMasterTab.current) {
        if (dcTab.current && dcTab.current.readyState === 'open') {
          dcTab.current.send(payload);
        }
      } else {
        broadcastChannel.current?.postMessage({
          type: 'TYPING_FROM_SECONDARY',
          senderId: localTabId.current,
          senderPeerId: localPeerId.current,
          isTyping
        });
      }
    }
  };

  // Handle typing key triggers
  const handleTypingKeyTrigger = (senderPanel: 'userA' | 'userB' | 'tab') => {
    if (senderPanel === 'userA') {
      if (!isATyping) {
        setIsATyping(true);
        sendTypingState(true, 'userA');
      }
      if (typingTimerA.current) clearTimeout(typingTimerA.current);
      typingTimerA.current = setTimeout(() => {
        setIsATyping(false);
        sendTypingState(false, 'userA');
      }, 1500);
    } else if (senderPanel === 'userB') {
      if (!isBTyping) {
        setIsBTyping(true);
        sendTypingState(true, 'userB');
      }
      if (typingTimerB.current) clearTimeout(typingTimerB.current);
      typingTimerB.current = setTimeout(() => {
        setIsBTyping(false);
        sendTypingState(false, 'userB');
      }, 1500);
    } else {
      // Tab panel typing state trigger (we can trigger local typing representation if needed)
      sendTypingState(true, 'tab');
    }
  };

  // Chunk-by-chunk file transfer implementation
  const handleSendFile = (e: React.ChangeEvent<HTMLInputElement>, senderPanel: 'userA' | 'userB' | 'tab') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (senderPanel === 'tab' && !isMasterTab.current) {
      alert("⚠️ Hành động bị chặn: Chỉ Master Tab mới được phép gửi file!");
      return;
    }

    // Check size limit: max 4MB for fast base64 local transfer
    if (file.size > 4 * 1024 * 1024) {
      alert("Để truyền P2P mượt mà, vui lòng chọn file dưới 4MB!");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const isImage = file.type.startsWith('image/');
      const formattedSize = file.size > 1024 * 1024 
        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
        : (file.size / 1024).toFixed(0) + ' KB';

      // 1. Prepare chunks (size 16KB per chunk to fit RTC Datachannel standard limit safely)
      const chunkSize = 16384; 
      const totalChunks = Math.ceil(dataUrl.length / chunkSize);
      
      const fileId = 'file_' + Math.random().toString(36).substr(2, 9);
      
      setFileTransferProgress({
        name: file.name,
        progress: 0,
        type: 'send'
      });

      // Send file metadata
      const metaPayload = JSON.stringify({
        type: 'file-meta',
        name: file.name,
        size: formattedSize,
        total: totalChunks,
        isImage: isImage
      });

      // Determine active channel
      let activeChannel: RTCDataChannel | null = null;
      if (senderPanel === 'userA') activeChannel = dcA.current;
      else if (senderPanel === 'userB') activeChannel = dcB.current;
      else activeChannel = dcTab.current;

      if (!activeChannel || activeChannel.readyState !== 'open') {
        alert("Kết nối P2P chưa sẵn sàng để truyền tải file!");
        setFileTransferProgress(null);
        return;
      }

      activeChannel.send(metaPayload);

      // Send chunks with minor delays to avoid buffering overflows
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const chunk = dataUrl.substring(start, start + chunkSize);
        
        const chunkPayload = JSON.stringify({
          type: 'file-chunk',
          fileId: fileId,
          index: i,
          chunk: chunk
        });

        activeChannel.send(chunkPayload);
        
        // Minor inline sleep to keep Datachannel queue from clogging
        await new Promise(r => setTimeout(r, 20));

        // Update progress bar
        const percent = Math.round(((i + 1) / totalChunks) * 100);
        setFileTransferProgress({
          name: file.name,
          progress: percent,
          type: 'send'
        });
      }

      // Add to local message list
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const localFileMsg: ChatMessage = {
        id: fileId,
        sender: 'local',
        timestamp: time,
        reactions: [],
        file: {
          name: file.name,
          size: formattedSize,
          dataUrl: dataUrl,
          isImage: isImage
        }
      };

      if (senderPanel === 'userA') setUserAMessages(prev => [...prev, localFileMsg]);
      else if (senderPanel === 'userB') setUserBMessages(prev => [...prev, localFileMsg]);
      else setTabMessages(prev => [...prev, localFileMsg]);

      setFileTransferProgress(null);
    };

    reader.readAsDataURL(file);
  };

  // Clear logs helper
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Scroll to bottom helper
  useEffect(() => {
    userAChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [userAMessages]);

  useEffect(() => {
    userBChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [userBMessages, isATyping]); // Trigger scroll down on incoming typing state too!

  // Multi-tab connection setup trigger on mode switch
  useEffect(() => {
    if (chatMode === 'split') {
      setupSplitConnection();
    } else {
      setupTabConnection();
    }

    return () => {
      // Notify other tabs on exit/close
      if (broadcastChannel.current) {
        broadcastChannel.current.postMessage({ 
          type: 'DISCONNECT',
          senderId: localTabId.current
        });
      }
      cleanupConnections();
      if (matchInterval.current) {
        clearInterval(matchInterval.current);
      }
    };
  }, [chatMode]);

  return (
    <div className="chat-wrapper">
      {/* Sidebar Controls and WebRTC Console Logs */}
      <aside className="chat-left-panel">
        <div className="panel-header">
          <h2 className="panel-title">Cấu hình WebRTC</h2>
          <p className="panel-desc">Kiểm thử kết nối WebRTC DataChannel truyền tải P2P trực tiếp.</p>
        </div>

        <div style={{ padding: '0 16px 12px' }}>
          <button 
            type="button"
            className="sidebar-toggle-btn"
            style={{ width: '100%', justifyContent: 'center', background: 'var(--bg-input)', fontSize: '0.82rem' }}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 size={14} style={{ marginRight: '6px' }} /> : <VolumeX size={14} style={{ marginRight: '6px' }} />}
            <span>Âm thanh nhận tin: {soundEnabled ? 'Bật' : 'Tắt'}</span>
          </button>
        </div>

        {/* Profile Summary Card */}
        <div className="p2p-sidebar-section" style={{ borderBottom: 'none', marginBottom: '8px' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            gap: '12px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              fontSize: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: gender === 'male' ? 'rgba(59, 130, 246, 0.15)' : gender === 'female' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(168, 85, 247, 0.15)',
              border: `2px solid ${gender === 'male' ? '#60a5fa' : gender === 'female' ? '#f472b6' : '#c084fc'}`
            }}>
              {gender === 'male' ? '🙋‍♂️' : gender === 'female' ? '🙋‍♀️' : '👤'}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{nickname}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                <span className={`p2p-badge ${gender}`}>
                  {gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : 'Khác'}
                </span>
                <span className="p2p-badge age">{age} tuổi</span>
              </div>
            </div>
            
            <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '8px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>GPS Lat/Lng:</span>
                <span style={{ fontFamily: 'monospace' }}>{computedLat.toFixed(4)}, {computedLng.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Offset vị trí:</span>
                <span>{locationOffset}m</span>
              </div>
            </div>

            <button 
              type="button"
              className="p2p-modal-btn primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.82rem',
                marginTop: '4px'
              }}
              onClick={() => setIsSettingsModalOpen(true)}
            >
              <Settings size={14} />
              Cấu hình ghép đôi
            </button>
          </div>
        </div>

        {/* Real-time Connection Console Panel */}
        <div className="console-logs-container">
          <div className="console-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Terminal size={12} />
              <span>P2P Console Connection Logs</span>
            </div>
            <button type="button" className="console-clear-btn" onClick={handleClearLogs}>Xóa</button>
          </div>
          <div className="console-log-box">
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '30px' }}>Đang đợi tín hiệu kết nối...</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className={`console-line ${log.type}`}>
                  [{log.time}] {log.text}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <div className="chat-main-panels-container">
        <div className="chat-panel-view">
          {!isTabConnected ? (
              <div className="p2p-setup-container">
                <div className="p2p-setup-card" style={{ maxWidth: '640px', width: '100%' }}>
                  <div className="p2p-setup-header" style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🤝</div>
                    <h3 className="p2p-setup-title">Kết nối Cá nhân vs Cá nhân (P2P)</h3>
                    <p className="p2p-setup-subtitle">
                      Thiết lập kết nối WebRTC trực tiếp dựa trên khoảng cách địa lý và tiêu chí lựa chọn.
                    </p>
                  </div>

                  {/* Mode Tabs */}
                  <div className="p2p-setup-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px', gap: '4px' }}>
                    <button
                      type="button"
                      className={`p2p-tab-btn ${matchingTab === 'nearby' ? 'active' : ''}`}
                      onClick={() => { setMatchingTab('nearby'); cleanupTabStateAndConnections(); }}
                      style={{
                        padding: '8px 16px',
                        background: matchingTab === 'nearby' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        border: 'none',
                        borderBottom: matchingTab === 'nearby' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: matchingTab === 'nearby' ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Compass size={14} />
                      Tìm quanh đây
                    </button>
                    <button
                      type="button"
                      className={`p2p-tab-btn ${matchingTab === 'random' ? 'active' : ''}`}
                      onClick={() => { setMatchingTab('random'); cleanupTabStateAndConnections(); }}
                      style={{
                        padding: '8px 16px',
                        background: matchingTab === 'random' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        border: 'none',
                        borderBottom: matchingTab === 'random' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: matchingTab === 'random' ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <UserCheck size={14} />
                      Ghép ngẫu nhiên
                    </button>
                    <button
                      type="button"
                      className={`p2p-tab-btn ${matchingTab === 'room' ? 'active' : ''}`}
                      onClick={() => { setMatchingTab('room'); cleanupTabStateAndConnections(); }}
                      style={{
                        padding: '8px 16px',
                        background: matchingTab === 'room' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        border: 'none',
                        borderBottom: matchingTab === 'room' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: matchingTab === 'room' ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Layers size={14} />
                      Phòng riêng
                    </button>
                  </div>

                  {/* Tab Contents */}
                  {matchingTab === 'nearby' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Đối tác lân cận phù hợp điều kiện lọc (dưới {maxDistance === -1 ? '∞' : maxDistance + 'm'}):
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Đã phát hiện: {getFilteredCandidates().length}
                        </span>
                      </div>

                      {getFilteredCandidates().length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                          <div className="radar-spinner" style={{ position: 'relative', width: '50px', height: '50px', marginBottom: '16px' }}>
                            <div className="radar-circle"></div>
                            <div className="radar-circle"></div>
                            <div className="radar-circle"></div>
                            <div className="radar-core"></div>
                          </div>
                          <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Đang quét sóng GPS dò tìm các đối tác xung quanh...</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '320px', textAlign: 'center' }}>
                            (Mở một Tab trình duyệt khác và chỉnh khoảng cách vị trí ảo để phù hợp với bộ lọc tối thiểu/tối đa)
                          </span>
                        </div>
                      ) : (
                        <div className="p2p-peers-grid">
                          {getFilteredCandidates().map(peer => (
                            <div key={peer.peerId} className="p2p-peer-card">
                              <div className="p2p-peer-card-header">
                                <div className={`p2p-peer-avatar gender-${peer.gender}`}>
                                  {peer.gender === 'male' ? '🙋‍♂️' : peer.gender === 'female' ? '🙋‍♀️' : '👤'}
                                </div>
                                <div className="p2p-peer-info">
                                  <div className="p2p-peer-name">{peer.nickname}</div>
                                  <div className="p2p-peer-meta">
                                    <span className={`p2p-badge ${peer.gender}`}>
                                      {peer.gender === 'male' ? 'Nam' : peer.gender === 'female' ? 'Nữ' : 'Khác'}
                                    </span>
                                    <span className="p2p-badge age">{peer.age}t</span>
                                    <span className="p2p-badge distance">{peer.distance.toFixed(0)}m</span>
                                  </div>
                                </div>
                              </div>
                              <div className="p2p-peer-details">
                                <div className="p2p-peer-detail-row">
                                  <span>Khoảng cách:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{peer.distance.toFixed(0)} mét</span>
                                </div>
                                <div className="p2p-peer-detail-row">
                                  <span>Tọa độ:</span>
                                  <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                    {peer.lat.toFixed(4)}, {peer.lng.toFixed(4)}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="p2p-setup-btn"
                                onClick={() => handleConnectPeer(peer)}
                                style={{ marginTop: '4px', padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                Kết nối
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {matchingTab === 'random' && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      {isMatching ? (
                        <div className="p2p-radar-searching" style={{ margin: '0 auto' }}>
                          <div className="radar-spinner" style={{ margin: '0 auto 16px' }}>
                            <div className="radar-circle"></div>
                            <div className="radar-circle"></div>
                            <div className="radar-circle"></div>
                            <div className="radar-core"></div>
                          </div>
                          <h4 style={{ margin: '0 0 8px', fontWeight: 600 }}>Đang ghép cặp ngẫu nhiên...</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 20px' }}>
                            Quét tìm đối tác đáp ứng điều kiện lọc (Khoảng cách & Giới tính)
                          </p>
                          <button 
                            type="button" 
                            className="p2p-setup-btn danger" 
                            onClick={handleLeaveOrDisconnect}
                            style={{ maxWidth: '180px', margin: '0 auto' }}
                          >
                            Hủy ghép cặp
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', maxWidth: '380px', margin: '0 auto 12px', lineHeight: '1.4' }}>
                            Tự động tìm kiếm và liên kết WebRTC trực tiếp với một đối tác ngẫu nhiên nằm ngoài phạm vi 200m và thỏa mãn bộ lọc của bạn.
                          </p>
                          <button 
                            type="button" 
                            className="p2p-setup-btn" 
                            onClick={handleStartRandomMatch}
                            style={{ maxWidth: '200px' }}
                          >
                            Bắt đầu tìm ghép cặp
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {matchingTab === 'room' && (
                    <div>
                      {joinedRoom ? (
                        <div className="p2p-radar-searching" style={{ textAlign: 'center' }}>
                          <div className="radar-spinner" style={{ margin: '0 auto 16px' }}>
                            <div className="radar-circle"></div>
                            <div className="radar-circle"></div>
                            <div className="radar-circle"></div>
                            <div className="radar-core"></div>
                          </div>
                          <h4 style={{ margin: '0 0 8px', fontWeight: 600 }}>Đang chờ đối tác vào phòng: <span style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{joinedRoom}</span></h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 20px' }}>
                            Vui lòng nhập cùng tên phòng này ở tab khác để kết nối.
                          </p>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              type="button" 
                              className="p2p-setup-btn secondary"
                              onClick={() => {
                                navigator.clipboard.writeText(joinedRoom);
                                alert("Đã sao chép mã phòng: " + joinedRoom);
                              }}
                            >
                              Sao chép mã phòng
                            </button>
                            <button 
                              type="button" 
                              className="p2p-setup-btn danger" 
                              onClick={handleLeaveOrDisconnect}
                            >
                              Thoát
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p2p-setup-options" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="p2p-setup-option-card" style={{ width: '100%' }}>
                            <h4 className="p2p-setup-option-title">🚪 Tạo hoặc tham gia phòng riêng</h4>
                            <p className="p2p-setup-option-desc">
                              Khởi tạo cuộc trò chuyện bảo mật bằng cách chia sẻ tên phòng.
                            </p>
                            <div className="p2p-setup-input-group" style={{ display: 'flex', width: '100%', gap: '8px', margin: '12px 0' }}>
                              <input 
                                type="text" 
                                className="p2p-setup-input" 
                                placeholder="Nhập tên phòng..." 
                                value={roomInput}
                                onChange={(e) => setRoomInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleJoinRoom(roomInput);
                                }}
                                style={{ flexGrow: 1 }}
                              />
                              <button 
                                type="button" 
                                className="p2p-setup-btn secondary"
                                title="Tạo Room ID ngẫu nhiên"
                                onClick={() => {
                                  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
                                  setRoomInput(rand);
                                }}
                                style={{ padding: '0 12px', minWidth: 'auto' }}
                              >
                                🪄
                              </button>
                            </div>
                            <button 
                              type="button" 
                              className="p2p-setup-btn" 
                              onClick={() => handleJoinRoom(roomInput)}
                              disabled={!roomInput.trim()}
                              style={{ width: '100%', opacity: roomInput.trim() ? 1 : 0.6 }}
                            >
                              Vào phòng
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="chat-panel-header">
                  <div className="peer-profile-header">
                    <div className="user-avatar" style={{ border: '2.5px solid var(--success)' }}>
                      <UserCheck size={16} />
                      <div className="status-indicator" style={{ backgroundColor: 'var(--success)' }} />
                    </div>
                    <div>
                      <div className="peer-name">Đối tác P2P</div>
                      <div className="peer-status-text">
                        {joinedRoom ? `Đang chat trong phòng: ${joinedRoom.toUpperCase()}` : 'Đang chat qua Ghép cặp ngẫu nhiên'}
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="p2p-setup-btn danger" 
                    onClick={handleLeaveOrDisconnect}
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  >
                    Ngắt kết nối
                  </button>
                </div>

                <div className="chat-messages-area">
                  {tabMessages.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '300px' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💬</div>
                      <h3 style={{ margin: '0 0 6px' }}>Bắt đầu cuộc trò chuyện</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.4' }}>
                        Gửi tin nhắn hoặc kéo thả file để truyền tải dữ liệu trực tiếp tức thì qua kênh P2P WebRTC.
                      </p>
                    </div>
                  ) : (
                    tabMessages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        activeReactionMsgId={activeReactionMsgId}
                        setActiveReactionMsgId={setActiveReactionMsgId}
                        onReact={(emoji) => sendReaction(msg.id, emoji, 'tab')}
                      />
                    ))
                  )}
                  {isBTyping && <TypingIndicator />}
                  <div ref={userAChatEndRef} />
                </div>

                <ChatInputBar
                  placeholder="Nhập tin nhắn P2P..."
                  disabled={false}
                  onSend={(text) => sendMessage(text, 'tab')}
                  onTyping={() => handleTypingKeyTrigger('tab')}
                  onSendFile={(e) => handleSendFile(e, 'tab')}
                />
              </>
            )}
          </div>
      </div>

      {/* Real-time File Transfer Chunk Progress Alert */}
      {fileTransferProgress && (
        <div className="transfer-progress-overlay">
          <div className="progress-card">
            <div className="progress-title-text">
              {fileTransferProgress.type === 'send' ? 'Đang gửi file P2P...' : 'Đang nhận file P2P...'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileTransferProgress.name}
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${fileTransferProgress.progress}%` }} />
            </div>
            <div className="progress-percentage">{fileTransferProgress.progress}%</div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="p2p-modal-overlay" onClick={() => setIsSettingsModalOpen(false)}>
          <div className="p2p-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="p2p-modal-header">
              <h3 className="p2p-modal-title">
                <Settings size={18} />
                Cấu hình ghép đôi
              </h3>
              <button 
                type="button" 
                className="p2p-modal-close-btn"
                onClick={() => setIsSettingsModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p2p-modal-body">
              {/* User Profile Config */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.86rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hồ sơ cá nhân</h4>
                
                <div className="p2p-field-group">
                  <label className="p2p-field-label">Biệt danh</label>
                  <input 
                    type="text" 
                    className="p2p-select" 
                    style={{ cursor: 'text' }}
                    value={nickname} 
                    onChange={(e) => setNickname(e.target.value)} 
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="p2p-field-group">
                    <label className="p2p-field-label">Giới tính</label>
                    <select 
                      className="p2p-select" 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value as any)}
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  
                  <div className="p2p-field-group">
                    <label className="p2p-field-label">Tuổi: <span className="p2p-field-value">{age}</span></label>
                    <input 
                      type="number" 
                      className="p2p-select" 
                      style={{ cursor: 'text' }}
                      min={18} 
                      max={100} 
                      value={age} 
                      onChange={(e) => setAge(Number(e.target.value))} 
                    />
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0' }} />

              {/* Matching Preferences Config */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.86rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Điều kiện ghép cặp</h4>
                
                <div className="p2p-field-group">
                  <label className="p2p-field-label">Đối tượng ghép đôi</label>
                  <select 
                    className="p2p-select" 
                    value={preferredGender} 
                    onChange={(e) => setPreferredGender(e.target.value as any)}
                  >
                    <option value="all">Tất cả</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="p2p-field-group">
                    <label className="p2p-field-label">Khoảng cách quét tối đa</label>
                    <select 
                      className="p2p-select" 
                      value={maxDistance} 
                      onChange={(e) => setMaxDistance(Number(e.target.value))}
                    >
                      <option value={500}>500 mét</option>
                      <option value={2000}>2 kilômét</option>
                      <option value={10000}>10 kilômét</option>
                      <option value={-1}>Không giới hạn</option>
                    </select>
                  </div>
                  
                  <div className="p2p-field-group">
                    <label className="p2p-field-label">Chặn đối tác quá gần (Dưới)</label>
                    <select 
                      className="p2p-select" 
                      value={minDistance} 
                      onChange={(e) => setMinDistance(Number(e.target.value))}
                    >
                      <option value={0}>Không chặn</option>
                      <option value={100}>100 mét</option>
                      <option value={200}>200 mét (Mặc định)</option>
                      <option value={500}>500 mét</option>
                    </select>
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0' }} />

              {/* Geolocation & Simulated Offset */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.86rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Định vị & Giả lập GPS</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="p2p-field-group">
                    <label className="p2p-field-label">Tọa độ Lat</label>
                    <input 
                      type="text" 
                      className="p2p-select" 
                      style={{ cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                      value={computedLat.toFixed(6)} 
                      disabled
                    />
                  </div>
                  <div className="p2p-field-group">
                    <label className="p2p-field-label">Tọa độ Lng</label>
                    <input 
                      type="text" 
                      className="p2p-select" 
                      style={{ cursor: 'not-allowed', backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                      value={computedLng.toFixed(6)} 
                      disabled
                    />
                  </div>
                </div>

                <div className="p2p-field-group">
                  <div className="p2p-field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Khoảng cách ảo (Offset vị trí):</span>
                    <span className="p2p-field-value">{locationOffset} mét</span>
                  </div>
                  <input 
                    type="range" 
                    className="p2p-range-slider" 
                    min={0} 
                    max={1000} 
                    value={locationOffset} 
                    onChange={(e) => setLocationOffset(Number(e.target.value))} 
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                    * Điều chỉnh thanh trượt để test luật khoảng cách (Chặn kết nối quá gần dưới 200m).
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p2p-modal-footer">
              <button 
                type="button" 
                className="p2p-modal-btn primary"
                onClick={() => setIsSettingsModalOpen(false)}
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SUB-COMPONENTS
// ---------------------------------------------------------------------------


// Message bubble styling with support for Reactions & Files
interface MessageBubbleProps {
  msg: ChatMessage;
  activeReactionMsgId: string | null;
  setActiveReactionMsgId: (id: string | null) => void;
  onReact: (emoji: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  activeReactionMsgId,
  setActiveReactionMsgId,
  onReact
}) => {
  const isIncoming = msg.sender === 'remote';
  const showReactions = activeReactionMsgId === msg.id;

  return (
    <div 
      className={`chat-message-bubble ${isIncoming ? 'incoming' : 'outgoing'}`}
      style={{ animation: 'fadeIn 0.2s ease' }}
    >
      {/* File rendering */}
      {msg.file && (
        <div>
          {msg.file.isImage ? (
            <img 
              src={msg.file.dataUrl} 
              alt={msg.file.name} 
              className="file-image-preview" 
            />
          ) : (
            <div className="file-message-box">
              <div className="file-icon-box">
                <FileText size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <div className="file-meta-info">
                <span className="file-name-text">{msg.file.name}</span>
                <span className="file-size-text">{msg.file.size}</span>
              </div>
            </div>
          )}
          {/* Download link for files */}
          <a 
            href={msg.file.dataUrl} 
            download={msg.file.name} 
            style={{ fontSize: '0.72rem', color: isIncoming ? 'var(--primary)' : '#fff', textDecoration: 'underline', marginTop: '6px', display: 'inline-block' }}
          >
            Tải xuống file
          </a>
        </div>
      )}

      {/* Text message rendering */}
      {msg.text && <div>{msg.text}</div>}

      {/* Timestamp & read confirmation ticks */}
      <div className="message-meta">
        <span>{msg.timestamp}</span>
        {!isIncoming && <CheckCheck size={12} />}
      </div>

      {/* Emojis Reactions list displaying */}
      {msg.reactions.length > 0 && (
        <div className="message-reactions-row">
          {msg.reactions.map(r => (
            <div key={r.emoji} className="reaction-tag-badge">
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Small hover reaction toggle icon */}
      <button 
        type="button"
        className="sidebar-toggle-btn"
        style={{ position: 'absolute', top: '2px', right: isIncoming ? '-26px' : 'none', left: !isIncoming ? '-26px' : 'none', padding: '3px' }}
        onClick={() => setActiveReactionMsgId(showReactions ? null : msg.id)}
      >
        <Smile size={12} />
      </button>

      {/* Reaction select Quickbar */}
      {showReactions && (
        <div className="emoji-reaction-bar" onMouseLeave={() => setActiveReactionMsgId(null)}>
          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
            <button
              key={emoji}
              type="button"
              className="reaction-emoji-btn"
              onClick={() => onReact(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Chat Input bar
interface ChatInputBarProps {
  placeholder: string;
  disabled?: boolean;
  onSend: (text: string) => void;
  onTyping: () => void;
  onSendFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({
  placeholder,
  disabled = false,
  onSend,
  onTyping,
  onSendFile
}) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    onTyping();
  };

  return (
    <div className="chat-input-bar">
      <form onSubmit={handleSubmit} className="chat-bar-inner">
        {/* Upload attachment hidden input triggers */}
        <button 
          type="button" 
          className="chat-file-input-btn"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          title="Gửi tệp đính kèm (Ảnh, PDF...)"
        >
          <Paperclip size={16} />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onSendFile} 
          style={{ display: 'none' }}
          disabled={disabled}
        />

        <input
          type="text"
          className="text-input-field"
          placeholder={placeholder}
          value={text}
          onChange={handleInputChange}
          disabled={disabled}
        />

        <button 
          type="submit" 
          className="chat-send-btn"
          disabled={disabled || !text.trim()}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};

// Typing indicator bubble
const TypingIndicator: React.FC = () => {
  return (
    <div className="chat-message-bubble incoming" style={{ width: '60px', padding: '12px 14px' }}>
      <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--text-muted)', animation: 'bounce 1s infinite alternate' }} />
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--text-muted)', animation: 'bounce 1s infinite alternate 0.2s' }} />
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--text-muted)', animation: 'bounce 1s infinite alternate 0.4s' }} />
      </div>
      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

export default ChatP2PApp;
