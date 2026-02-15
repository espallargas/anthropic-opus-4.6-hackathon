import { useEffect, useRef } from 'react';
import type { Subscription } from '@rails/actioncable';
import consumer from '../lib/cable';

export interface ExtractionUpdate {
  type: 'extraction_update';
  legislation_id: number;
  country_code: string;
  extraction_status: 'processing' | 'completed' | 'failed';
  token_count: number | null;
}

export function useExtractionChannel(onUpdate: (data: ExtractionUpdate) => void) {
  const callbackRef = useRef(onUpdate);

  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const subscription: Subscription = consumer.subscriptions.create('ExtractionChannel', {
      received(data: ExtractionUpdate) {
        callbackRef.current(data);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
