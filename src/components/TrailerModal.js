import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TrailerModal({ visible, videoKey, onClose }) {
  const insets = useSafeAreaInsets();

  if (!visible || !videoKey) return null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta name="referrer" content="strict-origin-when-cross-origin">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { width: 100%; height: 100%; background-color: #000000; display: flex; justify-content: center; align-items: center; overflow: hidden; }
          .video-container { width: 100%; height: 100%; position: relative; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <div class="video-container">
          <iframe 
            src="https://www.youtube.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&mute=1&controls=1&playsinline=1&rel=0&origin=https%3A%2F%2Fwww.youtube.com"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        </div>
      </body>
    </html>
  `;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Header Bar */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 25) }]}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Video Player */}
        <View style={styles.playerContainer}>
          <WebView
            style={styles.webview}
            source={{ 
              html: htmlContent, 
              baseUrl: 'https://www.youtube.com' 
            }}
            originWhitelist={['*']}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            mixedContentMode="always"
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#ff9800" />
              </View>
            )}
          />
        </View>

        {/* YouTube Uygulamasında Aç Hızlı Yedek Butonu */}
        <TouchableOpacity 
          style={styles.openYoutubeBtn}
          onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${videoKey}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-youtube" size={20} color="#ff4444" style={{ marginRight: 8 }} />
          <Text style={styles.openYoutubeBtnText}>YouTube'da Aç</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 15,
    zIndex: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  openYoutubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  openYoutubeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
