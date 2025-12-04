import React from 'react';
import QRCode from 'react-qr-code';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 128 }) => {
  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 inline-block">
      <QRCode
        size={size}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        value={value}
        viewBox={`0 0 256 256`}
      />
      <p className="mt-2 text-center text-xs text-slate-400 font-mono">{value}</p>
    </div>
  );
};
