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

class YouSignClient {
  private apiKey: string;
  private baseUrl: string;
  private workspaceId: string;
  private isEnabled: boolean;

  constructor() {
    this.apiKey = process.env.YOUSIGN_API_KEY || '';
    this.workspaceId = process.env.YOUSIGN_WORKSPACE_ID || '';
    const environment = process.env.YOUSIGN_ENVIRONMENT || 'sandbox';

    this.baseUrl = environment === 'production'
      ? 'https://app.yousign.com/api/v3'
      : 'https://staging-app.yousign.com/api/v3';

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
      const { signerEmail, signerName, documentContent, documentName, message } = options;

      console.log('📝 Création de demande Yousign...');
      console.log(`👤 Signataire: ${signerName} (${signerEmail})`);
      console.log(`📄 Document: ${documentName}`);

      // 1️⃣ UPLOAD du document (retourner un file_id)
      console.log('📤 Étape 1: Upload du document...');
      const uploadFormData = new FormData();
      uploadFormData.append('file', new Blob([documentContent], { type: 'application/pdf' }), documentName);

      const uploadResponse = await fetch(`${this.baseUrl}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Upload failed:', uploadResponse.status, errorText);
        throw new Error(`Upload échoué: ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json() as any;
      const fileId = uploadData.id;

      if (!fileId) {
        throw new Error('Pas d\'ID de fichier retourné');
      }

      console.log('✅ Document uploadé:', fileId);

      // 2️⃣ CRÉER la demande de signature
      console.log('📋 Étape 2: Création de la demande de signature...');
      const signatureRequestBody = {
        workspace_id: this.workspaceId,
        document_ids: [fileId],
        signers: [
          {
            email: signerEmail,
            name: signerName,
            signature_level: 'electronic_signature',
          },
        ],
        name: `Convention - ${signerName}`,
        delivery_mode: 'email',
        reminder_settings: {
          enabled: true,
          days_before_expiration: 2,
        },
        expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
      };

      const signatureResponse = await fetch(`${this.baseUrl}/signature_requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signatureRequestBody),
      });

      if (!signatureResponse.ok) {
        const errorText = await signatureResponse.text();
        console.error('❌ Signature request failed:', signatureResponse.status, errorText);
        throw new Error(`Demande de signature échouée: ${signatureResponse.status}`);
      }

      const signatureData = await signatureResponse.json() as any;
      const requestId = signatureData.id;
      const signerUrl = signatureData.signers?.[0]?.signature_link;

      if (!requestId || !signerUrl) {
        console.error('❌ Réponse Yousign incomplète:', signatureData);
        throw new Error('Réponse Yousign incomplète');
      }

      console.log('✅ Demande de signature créée:', requestId);
      console.log('🔗 Lien de signature:', signerUrl);

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
      const response = await fetch(`${this.baseUrl}/signature_requests/${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Vérification échouée: ${response.status}`);
      }

      const data = await response.json() as any;
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

export default new YouSignClient();
