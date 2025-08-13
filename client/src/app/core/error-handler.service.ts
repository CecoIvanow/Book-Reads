import { ErrorHandler, Injectable } from '@angular/core';
import { SnackbarService } from '../shared/snackbar.service.js';

@Injectable({
    providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {

    constructor(private _snackBar: SnackbarService) { }

    handleError(error: unknown): void {
        const defaultMessage = 'An unexpected error occurred, please relog or try again later!';
        let message = defaultMessage;

        console.error('Global Error:', error);

        if (typeof error === 'string') {
            message = error;
        }
        else if (error && typeof error === 'object') {

            if ('error' in error && typeof error.error === 'object' && error.error !== null) {
                const nestedError = error.error;
                if ('message' in nestedError && typeof nestedError.message === 'string') {
                    message = nestedError.message;
                }
            }


            if (message === defaultMessage && 'message' in error && typeof error.message === 'string') {
                message = error.message;
            }
        }

        this._snackBar.showSnackBar(message);
    }
}