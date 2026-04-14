import React from 'react';

import { Alert, Button, Stack, Text, Title } from '@mantine/core';
import { Html5Qrcode, type Html5QrcodeCameraScanConfig } from 'html5-qrcode';

import { processScannedQr, type ScanResult } from '../model/scan.thunk.js';

/** DOM-id контейнера, в который html5-qrcode рендерит поток камеры. */
const SCANNER_ELEMENT_ID = 'flare-qr-scanner';

/** Конфигурация сканера: QR в центре, FPS 10. */
const SCANNER_CONFIG: Html5QrcodeCameraScanConfig = {
  fps: 10,
  qrbox: { width: 240, height: 240 },
};

/**
 * Пропсы `QrScanner`.
 *
 * @prop {(result: ScanResult) => void} [onScanned] - Коллбек при успешном сканировании.
 */
export interface QrScannerProps {
  onScanned?: (result: ScanResult) => void;
}

/**
 * Экран сканирования QR-кода чужого пользователя.
 * При успешном чтении парсит payload, запрашивает публичный ключ, отправляет запрос дружбы.
 */
export function QrScanner({ onScanned }: QrScannerProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const scannerRef = React.useRef<Html5Qrcode | null>(null);

  const stop = React.useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
      await scanner.stop();
    }
    scannerRef.current = null;
    setIsScanning(false);
  }, []);

  const start = React.useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;
      setIsScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        SCANNER_CONFIG,
        async (decodedText) => {
          await stop();
          try {
            const scanResult = await processScannedQr(decodedText);
            setResult(scanResult);
            onScanned?.(scanResult);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Не удалось обработать QR');
          }
        },
        () => {
          // Игнорируем кадры без распознанного QR — сканер продолжает работать.
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось запустить камеру');
      setIsScanning(false);
    }
  }, [onScanned, stop]);

  React.useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return (
    <Stack gap="md" align="center">
      <Title order={2}>Сканировать QR</Title>
      <div id={SCANNER_ELEMENT_ID} style={{ width: 300, height: 300 }} />
      {!isScanning && !result && <Button onClick={start}>Запустить камеру</Button>}
      {isScanning && (
        <Button variant="subtle" onClick={stop}>
          Остановить
        </Button>
      )}
      {result && (
        <Alert color="green" role="status">
          Запрос отправлен пользователю «{result.addresseeName}».
        </Alert>
      )}
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      <Text size="sm" c="dimmed">
        Наведите камеру на QR-код другого пользователя Flare.
      </Text>
    </Stack>
  );
}
