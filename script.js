let APP_ID = "1a4dca7b4c2e440f96d4fcce57ddb802";

let token = null;
let uid = String(Math.floor(Math.random() * 10000))

let client;
let channel;

let localStream;
let remoteStream;
let peerConnection;

// const servers = {
//     iceServers: [
//         {
//             urls: ['stun:stun1.l.google.com:19302',
//                    'stun:stun2.l.google.com:19302']
//         }
//     ]
// }

// const servers = {
//     iceServers: [
//         {
//             // url: 'turn:numb.viagenie.ca',
//             // credential: 'muazkh',
//             // username: 'webrtc@live.com'

//             // url: 'turn:192.158.29.39:3478?transport=udp',
//             // credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//             // username: '28224511:1379330808'

//             // url: 'turn:relay1.expressturn.com:3478',
//             // username: 'efQ4A81BFTV6E3JTDD',
//             // credential: 'Jz2evOzYm77j2RrE'
//             urls: [
//                 {
//                     url: 'turn:numb.viagenie.ca',
//                     credential: 'muazkh',
//                     username: 'webrtc@live.com'
//                 },
//                 {
//                     url: 'turn:192.158.29.39:3478?transport=udp',
//                     credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//                     username: '28224511:1379330808'
//                 },
//                 {
//                     url: 'turn:192.158.29.39:3478?transport=tcp',
//                     credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//                     username: '28224511:1379330808'
//                 },
//                 {
//                     url: 'turn:turn.bistri.com:80',
//                     credential: 'homeo',
//                     username: 'homeo'
//                  },
//                  {
//                     url: 'turn:turn.anyfirewall.com:443?transport=tcp',
//                     credential: 'webrtc',
//                     username: 'webrtc'
//                 }
//             ]
//         }
//     ]
// }

const servers = {
    "username": "dc2d2894d5a9023620c467b0e71cfa6a35457e6679785ed6ae9856fe5bdfa269",
    "ice_servers": [
      {
        "urls": "stun:global.stun.twilio.com:3478"
      },
      {
        "username": "dc2d2894d5a9023620c467b0e71cfa6a35457e6679785ed6ae9856fe5bdfa269",
        "credential": "tE2DajzSJwnsSbc123",
        "urls": "turn:global.turn.twilio.com:3478?transport=udp"
      },
      {
        "username": "dc2d2894d5a9023620c467b0e71cfa6a35457e6679785ed6ae9856fe5bdfa269",
        "credential": "tE2DajzSJwnsSbc123",
        "urls": "turn:global.turn.twilio.com:3478?transport=tcp"
      },
      {
        "username": "dc2d2894d5a9023620c467b0e71cfa6a35457e6679785ed6ae9856fe5bdfa269",
        "credential": "tE2DajzSJwnsSbc123",
        "urls": "turn:global.turn.twilio.com:443?transport=tcp"
      }
    ],
    "date_updated": "Fri, 01 May 2020 01:42:57 +0000",
    "account_sid": "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "ttl": "86400",
    "date_created": "Fri, 01 May 2020 01:42:57 +0000",
    "password": "tE2DajzSJwnsSbc123"
  }

let init = async() => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid, token})

    channel = client.createChannel('main')
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer', handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia({
        video : true,
        audio : true
    })
    document.getElementById('user-1').srcObject = localStream
}

let handleUserLeft = (MemberId) => {
    document.getElementById('user-2').style.display = 'none'
}

let handleMessageFromPeer = async (message, MemberId) => {
    message = JSON.parse(message.text)

    if (message.type === 'offer') {
        createAnswer(MemberId, message.offer)
    }

    if (message.type === 'answer') {
        addAnswer(message.answer)
    }

    if (message.type === 'candidate') {
        if (peerConnection) {
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

let handleUserJoined = async(MemberId) => {
    console.log('A new user joined the channel', MemberId)
    createOffer(MemberId)
}

let createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers)

    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block'

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({
            video : true,
            audio : true
        })
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            client.sendMessageToPeer({text: JSON.stringify({'type': 'candidate', 'candidate': event.candidate})}, MemberId)
        }
    }
}

let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    client.sendMessageToPeer({text: JSON.stringify({'type': 'offer', 'offer': offer})}, MemberId)
}

let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text: JSON.stringify({'type': 'answer', 'answer': answer})}, MemberId)
}

let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

window.addEventListener('beforeunload', leaveChannel)

init()