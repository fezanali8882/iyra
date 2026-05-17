declare global {
  interface Window {
    grecaptcha: any;
  }
}

export const executeRecaptcha = (action: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { grecaptcha } = window as any;
    if (!grecaptcha || !grecaptcha.enterprise) {
      console.warn('reCAPTCHA Enterprise not loaded');
      resolve('');
      return;
    }

    grecaptcha.enterprise.ready(async () => {
      try {
        const token = await grecaptcha.enterprise.execute('6LcDse4sAAAAAKDnOLSTioNUXDw66WASPHLg0W9i', { action });
        resolve(token);
      } catch (err) {
        console.error('reCAPTCHA execution failed:', err);
        resolve('');
      }
    });
  });
};
