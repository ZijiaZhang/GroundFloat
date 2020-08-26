export interface IUserJoinPayload {
    callerID: string;
    signal: string;

}

export interface ISendingSignalPayload {
    callerID: string;
    signal: string;
    userToSignal: string;
}

export interface IReceiveSignal {
    signal: string;
    id: string;
}

export interface IReturnSignal {
    signal: string;
    callerID: string;
}
