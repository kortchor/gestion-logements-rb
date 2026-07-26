/**
 * Yousign API Client (v3)
 * Intégration réelle avec l'API Yousign pour la signature électronique
 */

interface CreateSignatureRequestOptions {
  signerEmail: string;
  signerName: string;
  documentContent: Buffer;
  documentName: string;
  message?: string;
}

interface SignatureResponse {
  success: boolean;
  signatureRequestId?: string;
  signatureLink?: string;
  signerUrl?: string;
  error?: string;
}

interface YousignCreateRequestResponse {
  id: string;
}

interface YousignUploadResponse {
  id: string;
}

interface YousignSignerResponse {
  id: string;
}

interface YousignActivateResponse {
  signers?: Array<{ signature_link?: string }>;
}

interface YousignStatusResponse {
  status?: string;
}

class YouSignClient {
  private apiKey: string;
  private baseUrl: string;
  private workspaceId: string;
  private isEnabled: boolean;

  private async fetchWithTimeout(
    input: string,
    init: RequestInit,
    timeoutMs = 15000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  constructor() {
    this.apiKey = process.env.YOUSIGN_API_KEY || '';
    this.workspaceId = process.env.YOUSIGN_WORKSPACE_ID || '';
    const environment = process.env.YOUSIGN_ENVIRONMENT || 'sandbox';

    this.baseUrl = environment === 'production'
      ? 'https://api.yousign.app/v3'
      : 'https://api-sandbox.yousign.app/v3';

    // Vérifier que les clés sont configurées
    this.isEnabled = !!(this.apiKey && this.workspaceId);

    if (!this.isEnabled) {
      console.warn('⚠️ Yousign non configuré : variables d\'environnement manquantes');
    } else {
      console.log('✅ Yousign Client initialisé (Environment: ' + environment + ')');
    }
  }

  /**
   * Créer une demande de signature Yousign avec un document PDF
   */
  async createSignatureRequest(options: CreateSignatureRequestOptions): Promise<SignatureResponse> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'Yousign non configuré',
      };
    }

    try {
      const { signerEmail, signerName, documentContent, documentName } = options;

      console.log('📝 Création de demande Yousign...');
      console.log(`👤 Signataire: ${signerName}`);
      console.log(`📄 Document: ${documentName}`);

      // 1️⃣ CRÉER la demande de signature (vide)
      console.log('📋 Étape 1: Création de la demande de signature...');
      
      // Date d'expiration au format YYYY-MM-DD
      const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const cleanSignerName = signerName.trim();

      const createBody = {
        name: `Convention - ${cleanSignerName}`,
        workspace_id: this.workspaceId,
        delivery_mode: 'email',
        expiration_date: expirationDate,
        reminder_settings: {
          interval_in_days: 2,
          max_occurrences: 2,
        },
      };

      const createResponse = await this.fetchWithTimeout(`${this.baseUrl}/signature_requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBody),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('❌ Création demande échouée:', createResponse.status, errorText);
        throw new Error(`Création demande échouée: ${createResponse.status} - ${errorText}`);
      }

      const createData = await createResponse.json() as YousignCreateRequestResponse;
      const requestId = createData.id;
      console.log('✅ Demande créée:', requestId);

      // 2️⃣ UPLOADER le document vers la demande
      console.log('📤 Étape 2: Upload du document...');
      const uploadFormData = new FormData();
      const documentBytes = new Uint8Array(documentContent);
      uploadFormData.append('file', new Blob([documentBytes], { type: 'application/pdf' }), documentName);
      uploadFormData.append('nature', 'signable_document');

      const uploadResponse = await this.fetchWithTimeout(`${this.baseUrl}/signature_requests/${requestId}/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Upload échoué:', uploadResponse.status, errorText);
        throw new Error(`Upload échoué: ${uploadResponse.status} - ${errorText}`);
      }
      const uploadData = await uploadResponse.json() as YousignUploadResponse;
      console.log('✅ Document uploadé:', uploadData.id);

      // 3️⃣ AJOUTER le signataire
      console.log('👤 Étape 3: Ajout du signataire...');
      const nameParts = cleanSignerName.split(' ');
      const firstName = nameParts[0] || 'Signataire';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      // Nettoyer les noms pour éviter les caractères non valides
      // Garder uniquement: lettres, espaces, tirets, apostrophes
      const sanitize = (str: string) => str.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '').trim() || 'N/A';
      
      const signerResponse = await this.fetchWithTimeout(`${this.baseUrl}/signature_requests/${requestId}/signers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          info: { 
            first_name: sanitize(firstName), 
            last_name: sanitize(lastName), 
            email: signerEmail.trim(),
            locale: 'fr',
          },
          signature_level: 'electronic_signature',
          signature_authentication_mode: 'no_otp',
          fields: [{ document_id: uploadData.id, type: 'signature', page: 1, x: 400, y: 700, width: 150, height: 50 }],
        }),
      });

      if (!signerResponse.ok) {
        const errorText = await signerResponse.text();
        console.error('❌ Ajout signataire échoué:', signerResponse.status, errorText);
        throw new Error(`Ajout signataire échoué: ${signerResponse.status} - ${errorText}`);
      }
      const signerData = await signerResponse.json() as YousignSignerResponse;
      console.log('✅ Signataire ajouté:', signerData.id);

      // 4️⃣ ACTIVER la demande
      console.log('🚀 Étape 4: Activation de la demande...');
      const activateResponse = await this.fetchWithTimeout(`${this.baseUrl}/signature_requests/${requestId}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      if (!activateResponse.ok) {
        const errorText = await activateResponse.text();
        console.error('❌ Activation échouée:', activateResponse.status, errorText);
        throw new Error(`Activation échouée: ${activateResponse.status} - ${errorText}`);
      }
      const activateData = await activateResponse.json() as YousignActivateResponse;
      const signerUrl = activateData.signers?.[0]?.signature_link;

      if (!signerUrl) {
        console.error('❌ Lien de signature absent dans la réponse:', activateData);
        throw new Error('Lien de signature absent dans la réponse Yousign');
      }

      console.log('✅ Demande activée, lien de signature:', signerUrl);

      return {
        success: true,
        signatureRequestId: requestId,
        signatureLink: signerUrl,
        signerUrl: signerUrl,
      };
    } catch (error) {
      console.error('❌ Erreur Yousign:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Vérifier le statut d'une demande de signature
   */
  async checkSignatureStatus(requestId: string): Promise<{
    success: boolean;
    status?: string;
    completed?: boolean;
    error?: string;
  }> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'Yousign non configuré',
      };
    }

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/signature_requests/${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Vérification échouée: ${response.status}`);
      }

      const data = await response.json() as YousignStatusResponse;
      const status = data.status;
      const completed = status === 'completed' || status === 'done';

      return {
        success: true,
        status,
        completed,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }
}

const youSignClient = new YouSignClient();

export default youSignClient;
