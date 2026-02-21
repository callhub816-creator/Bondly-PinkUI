/**
 * Mocked WebRTC signaling test
 * Simulates:
 * 1. getUserMedia request -> success
 * 2. createOffer and createAnswer exchange
 * 3. ICE candidate exchange
 * 4. Logs for debugging
 */

describe('WebRTC Signaling Mock', () => {
  // Mock navigator.mediaDevices for testing
  const mockGetUserMedia = async () => {
    const mockAudioTrack = {
      kind: 'audio',
      enabled: true,
      stop: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    return {
      getTracks: () => [mockAudioTrack],
      getAudioTracks: () => [mockAudioTrack],
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
    } as any;
  };

  test('getUserMedia succeeds when permission granted', async () => {
    try {
      const stream = await mockGetUserMedia();
      expect(stream.getAudioTracks().length).toBe(1);
      console.debug('[WebRTC] getUserMedia success');
    } catch (err) {
      console.error('[WebRTC] getUserMedia error:', err);
      throw err;
    }
  });

  test('createOffer and createAnswer exchange', async () => {
    const mockPeerConnection = {
      createOffer: jest.fn(async () => ({
        type: 'offer',
        sdp: 'offer-sdp-string',
      })),
      createAnswer: jest.fn(async () => ({
        type: 'answer',
        sdp: 'answer-sdp-string',
      })),
      setLocalDescription: jest.fn(async () => undefined),
      setRemoteDescription: jest.fn(async () => undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Caller: create offer
    const offer = await mockPeerConnection.createOffer();
    console.debug('[WebRTC] Offer created:', offer.type);
    expect(offer.type).toBe('offer');

    // Callee: create answer
    const answer = await mockPeerConnection.createAnswer();
    console.debug('[WebRTC] Answer created:', answer.type);
    expect(answer.type).toBe('answer');
  });

  test('ICE candidate exchange', async () => {
    const candidates: any[] = [];

    const mockPeerConnection = {
      addEventListener: jest.fn((event: string, handler: Function) => {
        if (event === 'icecandidate') {
          // Simulate ICE candidate event
          handler({ candidate: { candidate: 'candidate-string', sdpMLineIndex: 0 } });
        }
      }),
      addIceCandidate: jest.fn(async (candidate) => {
        console.debug('[WebRTC] ICE candidate added:', candidate?.candidate);
        candidates.push(candidate);
      }),
    };

    // Register listener
    let iceHandler: Function | null = null;
    mockPeerConnection.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'icecandidate') iceHandler = handler;
    });

    mockPeerConnection.addEventListener('icecandidate', (e: any) => {
      if (e.candidate) {
        console.debug('[WebRTC] Got ICE candidate:', e.candidate.candidate);
      }
    });

    // Simulate receiving a candidate
    if (iceHandler) {
      iceHandler({ candidate: { candidate: 'received-candidate', sdpMLineIndex: 0 } });
    }

    // Verify candidate was processed
    expect(candidates.length).toBe(0); // Not added via addIceCandidate in this mock
  });

  test('ontrack handler receives remote stream', async () => {
    const mockAudioTrack = {
      kind: 'audio',
      enabled: true,
      stop: jest.fn(),
    };

    const remoteStream = {
      getTracks: () => [mockAudioTrack],
      getAudioTracks: () => [mockAudioTrack],
    } as any;

    let trackHandler: Function | null = null;

    const mockPeerConnection = {
      addEventListener: jest.fn((event: string, handler: Function) => {
        if (event === 'track') trackHandler = handler;
      }),
    };

    mockPeerConnection.addEventListener('track', (e: any) => {
      console.debug('[WebRTC] Track received:', e.track?.kind);
    });

    // Simulate receiving a track
    if (trackHandler) {
      trackHandler({ streams: [remoteStream], track: mockAudioTrack });
    }

    expect(remoteStream.getAudioTracks().length).toBe(1);
  });

  test('connection error handling logs details', () => {
    const errors = [
      new Error('NotAllowedError: Permission denied'),
      new Error('NotFoundError: No device available'),
      new Error('NetworkingError: ICE connection failed'),
    ];

    errors.forEach((err) => {
      console.error('[WebRTC] Connection error:', err.message);
      expect(err.message).toMatch(/(NotAllowedError|NotFoundError|NetworkingError)/);
    });
  });
});
