declare module 'react-qr-scanner' {
    import React from 'react';

    interface QRScannerProps {
        delay?: number;
        onError?: (err: Error) => void;
        onScan?: (data: string | null) => void;
        style?: React.CSSProperties;
    }

    const QRScanner: React.FC<QRScannerProps>;
    export default QRScanner;
}
