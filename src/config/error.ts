export const error_message = (error: any) => {
    return error.message
        || error.reason || (error.data && error.data.message) || JSON.stringify(error);
}