import express from "express"
import path from "path"
import http from "http"
const app = express();
app.use(express.static('./public'));
app.use('/room/*', (req: any, res: { sendFile: (arg0: any) => void; }) =>{
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const server = http.createServer(app);
import socket, {Client, Namespace, Socket} from "socket.io"
import {SocketEvents} from "./shared/socketEvents";
import {IReturnSignal, ISendingSignalPayload} from "./shared/Inerfaces";
const io = socket(server);



io.on('connection', (socket: Socket) => {
    socket.on(SocketEvents.Join_Room, (roomID: string) => {
        console.log(`${socket.id} joining ${roomID}`);
        const clients = io.sockets.adapter.rooms[roomID];
        const numClients = clients ? clients.length : 0;
        if (numClients === 2) {
            socket.emit(SocketEvents.Room_Full);
            return;
        }
        socket.join(roomID);
        console.log(`${socket.id} joined ${roomID}`);

        io.of('/').in(roomID).clients((err: Error, clients: string[])=>{
            clients = clients.filter((id: string) => id !== socket.id);
            socket.emit(SocketEvents.All_Users, clients);
        });


    });

    socket.on(SocketEvents.Sending_Signal, (payload: ISendingSignalPayload) => {
        console.log(`${socket.id} send signal to ${payload.userToSignal}`);
        io.to(payload.userToSignal).emit(SocketEvents.User_Joined, { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on(SocketEvents.Returning_Signal, (payload: IReturnSignal) => {
        console.log(`${socket.id} return signal to ${payload.callerID}`);
        io.to(payload.callerID).emit(SocketEvents.Receive_Signal, { signal: payload.signal, id: socket.id });
    });

    socket.on(SocketEvents.Leave_Room, () =>{
        console.log(`${socket.id} left`);
        socket.disconnect();
    });

    socket.on('disconnecting', () => {
        console.log(`${socket.id} disconnected`);
        for (let room of Object.keys(socket.rooms)){

            if (room !== socket.id){
                io.to(room).emit(SocketEvents.User_Left, socket.id);
            }
        }
    });

    socket.on(SocketEvents.File_Size, (size) => {
        for (let room of Object.keys(socket.rooms)){
            if (room !== socket.id){
                io.to(room).emit(SocketEvents.File_Size, {size, id: socket.id});
            }
        }
    });

    socket.on(SocketEvents.Sending_File, () => {
        for (let room of Object.keys(socket.rooms)){
            if (room !== socket.id){
                io.to(room).emit(SocketEvents.Sending_File, socket.id);
            }
        }
    });
});

server.listen(process.env.PORT || 8000, () => console.log('server is running on port 8000'));