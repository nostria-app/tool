import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { nip19 } from 'nostr-tools';

interface GenericOutput {
  type: string;
  hex?: string;
  id?: string;
  pubkey?: string;
  identifier?: string;
  author?: string;
  kind?: number;
  relays?: string[];
}

@Component({
  selector: 'app-home',
  imports: [FormsModule, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  // Generic converter properties
  genericInput = '';
  genericOutput: GenericOutput | null = null;

  // Event converter properties
  eventHex = '';
  eventRelays = '';
  neventOutput = '';

  // Public key converter properties
  pubkeyInput = '';
  hexPubkeyOutput = '';
  npubOutput = '';

  // Profile converter properties
  profilePubkey = '';
  profileRelays = '';
  nprofileOutput = '';

  // Error handling
  errorMessage = '';

  convertGeneric(): void {
    this.clearError();
    
    if (!this.genericInput.trim()) {
      this.genericOutput = null;
      return;
    }

    try {
      const input = this.genericInput.trim();
      
      // Check if it's a raw hex string (64 characters)
      if (/^[a-fA-F0-9]{64}$/.test(input)) {
        this.genericOutput = {
          type: 'hex',
          hex: input
        };
        return;
      }

      // Check if it starts with 'nostr:' and remove it
      let cleanInput = input;
      if (input.startsWith('nostr:')) {
        cleanInput = input.substring(6);
      }

      // Try to decode using nip19
      const decoded = nip19.decode(cleanInput);
      
      switch (decoded.type) {
        case 'npub':
          this.genericOutput = {
            type: 'npub',
            hex: decoded.data
          };
          break;
          
        case 'nsec':
          this.genericOutput = {
            type: 'nsec',
            hex: Array.from(decoded.data).map(b => b.toString(16).padStart(2, '0')).join('')
          };
          break;
          
        case 'note':
          this.genericOutput = {
            type: 'note',
            hex: decoded.data
          };
          break;
          
        case 'nevent':
          this.genericOutput = {
            type: 'nevent',
            id: decoded.data.id,
            author: decoded.data.author,
            kind: decoded.data.kind,
            relays: decoded.data.relays
          };
          break;
          
        case 'nprofile':
          this.genericOutput = {
            type: 'nprofile',
            pubkey: decoded.data.pubkey,
            relays: decoded.data.relays
          };
          break;
          
        case 'naddr':
          this.genericOutput = {
            type: 'naddr',
            identifier: decoded.data.identifier,
            pubkey: decoded.data.pubkey,
            kind: decoded.data.kind,
            relays: decoded.data.relays
          };
          break;
          
        default:
          this.setError(`Unknown format type: ${(decoded as any).type}`);
          this.genericOutput = null;
      }
    } catch (error) {
      this.setError(`Error decoding input: ${error}`);
      this.genericOutput = null;
    }
  }

  convertEventHex(): void {
    this.clearError();
    
    if (!this.eventHex.trim()) {
      this.neventOutput = '';
      return;
    }

    try {
      const hex = this.eventHex.trim();
      
      // Validate hex format (64 characters, valid hex)
      if (!/^[a-fA-F0-9]{64}$/.test(hex)) {
        this.setError('Event hex must be exactly 64 hexadecimal characters');
        this.neventOutput = '';
        return;
      }

      const relays = this.parseRelays(this.eventRelays);
      
      this.neventOutput = nip19.neventEncode({
        id: hex,
        relays: relays
      });
    } catch (error) {
      this.setError(`Error encoding nevent: ${error}`);
      this.neventOutput = '';
    }
  }

  convertPubkey(): void {
    this.clearError();
    
    if (!this.pubkeyInput.trim()) {
      this.hexPubkeyOutput = '';
      this.npubOutput = '';
      return;
    }

    try {
      const input = this.pubkeyInput.trim();
      let hexPubkey = '';

      if (input.startsWith('npub')) {
        // Decode npub to hex
        const decoded = nip19.decode(input);
        if (decoded.type !== 'npub') {
          this.setError('Invalid npub format');
          return;
        }
        hexPubkey = decoded.data;
      } else if (/^[a-fA-F0-9]{64}$/.test(input)) {
        // Already hex format
        hexPubkey = input;
      } else {
        this.setError('Input must be either a valid npub or 64-character hex string');
        return;
      }

      this.hexPubkeyOutput = hexPubkey;
      this.npubOutput = nip19.npubEncode(hexPubkey);
    } catch (error) {
      this.setError(`Error converting public key: ${error}`);
      this.hexPubkeyOutput = '';
      this.npubOutput = '';
    }
  }

  convertProfile(): void {
    this.clearError();
    
    if (!this.profilePubkey.trim()) {
      this.nprofileOutput = '';
      return;
    }

    try {
      const input = this.profilePubkey.trim();
      let hexPubkey = '';

      if (input.startsWith('npub')) {
        // Decode npub to hex
        const decoded = nip19.decode(input);
        if (decoded.type !== 'npub') {
          this.setError('Invalid npub format');
          return;
        }
        hexPubkey = decoded.data;
      } else if (/^[a-fA-F0-9]{64}$/.test(input)) {
        // Already hex format
        hexPubkey = input;
      } else {
        this.setError('Public key must be either a valid npub or 64-character hex string');
        return;
      }

      const relays = this.parseRelays(this.profileRelays);
      
      this.nprofileOutput = nip19.nprofileEncode({
        pubkey: hexPubkey,
        relays: relays
      });
    } catch (error) {
      this.setError(`Error encoding nprofile: ${error}`);
      this.nprofileOutput = '';
    }
  }

  copyToClipboard(text: string): void {
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
      // Could show a temporary success message here
    }).catch(err => {
      this.setError(`Failed to copy to clipboard: ${err}`);
    });
  }

  private parseRelays(relaysText: string): string[] {
    if (!relaysText.trim()) return [];
    
    return relaysText
      .split('\n')
      .map(relay => relay.trim())
      .filter(relay => relay.length > 0)
      .filter(relay => {
        try {
          new URL(relay);
          return relay.startsWith('ws://') || relay.startsWith('wss://');
        } catch {
          return false;
        }
      });
  }

  private setError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => this.clearError(), 5000); // Clear error after 5 seconds
  }

  private clearError(): void {
    this.errorMessage = '';
  }
}
