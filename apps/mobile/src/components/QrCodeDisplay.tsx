import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  code: string;
  size?: number;
  label?: string;
  sublabel?: string;
}

export const QrCodeDisplay: React.FC<Props> = ({ code, size = 200, label, sublabel }) => {
  const [copied, setCopied] = React.useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    code
  )}`;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.qrWrapper, { width: size + 24, height: size + 24 }]}>
        <Image
          source={{ uri: qrUrl }}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </View>
      <TouchableOpacity style={styles.codeBadge} onPress={handleCopy} activeOpacity={0.7}>
        <MaterialCommunityIcons name="qrcode" size={18} color="#1E3A8A" />
        <Text style={styles.codeText}>{code}</Text>
        <MaterialCommunityIcons
          name={copied ? 'check' : 'content-copy'}
          size={16}
          color={copied ? '#16A34A' : '#6B7280'}
        />
      </TouchableOpacity>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  codeText: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#1E3A8A',
    fontSize: 14,
    letterSpacing: 1,
  },
  sublabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
});
