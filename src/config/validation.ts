export const isAbleToSendTransaction = (wallet: any, provider: any, amount?: any) => {
    if (!wallet || !provider || !amount || amount <= 0) {
        return false
    }

    return false
}