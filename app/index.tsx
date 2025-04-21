import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Image, PanResponder, Animated, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { analyzeImage, solveExpression } from './services/openai';

const CORNER_SIZE = 30;
const MIN_CROP_SIZE = 100;

export default function HomeScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState(false);
  const loadingAnimation = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  // Crop box position state
  const [cropPosition, setCropPosition] = useState({
    x: 0,
    y: 0,
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').height * 0.35,
  });

  // Initialize crop box in the center
  useEffect(() => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const initialX = (screenWidth - cropPosition.width) / 2;
    const initialY = (screenHeight - cropPosition.height) / 2;
    setCropPosition(prev => ({ ...prev, x: initialX, y: initialY }));
  }, []);

  // Create pan responders for each corner
  const createCornerPanResponder = (corner: 'TL' | 'TR' | 'BL' | 'BR') => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        setCropPosition(prev => {
          let newX = prev.x;
          let newY = prev.y;
          let newWidth = prev.width;
          let newHeight = prev.height;

          switch (corner) {
            case 'TL':
              newWidth = prev.width - gesture.dx;
              newHeight = prev.height - gesture.dy;
              newX = prev.x + gesture.dx;
              newY = prev.y + gesture.dy;
              break;
            case 'TR':
              newWidth = prev.width + gesture.dx;
              newHeight = prev.height - gesture.dy;
              newY = prev.y + gesture.dy;
              break;
            case 'BL':
              newWidth = prev.width - gesture.dx;
              newHeight = prev.height + gesture.dy;
              newX = prev.x + gesture.dx;
              break;
            case 'BR':
              newWidth = prev.width + gesture.dx;
              newHeight = prev.height + gesture.dy;
              break;
          }

          // Enforce minimum size
          if (newWidth < MIN_CROP_SIZE) {
            newWidth = MIN_CROP_SIZE;
            newX = corner.includes('L') ? prev.x + prev.width - MIN_CROP_SIZE : prev.x;
          }
          if (newHeight < MIN_CROP_SIZE) {
            newHeight = MIN_CROP_SIZE;
            newY = corner.includes('T') ? prev.y + prev.height - MIN_CROP_SIZE : prev.y;
          }

          return { x: newX, y: newY, width: newWidth, height: newHeight };
        });
      },
    });
  };

  const tlPanResponder = createCornerPanResponder('TL');
  const trPanResponder = createCornerPanResponder('TR');
  const blPanResponder = createCornerPanResponder('BL');
  const brPanResponder = createCornerPanResponder('BR');

  useEffect(() => {
    if (isProcessing) {
      Animated.spring(loadingAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(loadingAnimation, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [isProcessing]);

  if (!permission) {
    return <View style={styles.container}>
      <Text>Loading camera permissions...</Text>
    </View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          setCapturedPhoto(photo.uri);
        }
      } catch (error) {
        console.error('Failed to take picture:', error);
      }
    }
  };

  const handleConfirm = async () => {
    if (!capturedPhoto) return;

    try {
      setIsProcessing(true);

      // Get the image dimensions
      const imageInfo = await Image.getSize(capturedPhoto);
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;

      // Calculate scale factors
      const scaleX = imageInfo.width / screenWidth;
      const scaleY = imageInfo.height / screenHeight;

      // Convert screen coordinates to image coordinates
      const imageX = cropPosition.x * scaleX;
      const imageY = (cropPosition.y + 100) * scaleY; // Add 100 to account for the offset in the UI
      const imageWidth = cropPosition.width * scaleX;
      const imageHeight = cropPosition.height * scaleY;

      console.log('Original image dimensions:', imageInfo);
      console.log('Cropping image with dimensions:', {
        originX: Math.round(imageX),
        originY: Math.round(imageY),
        width: Math.round(imageWidth),
        height: Math.round(imageHeight)
      });

      // Crop and optimize the image in a single step
      const processedImage = await manipulateAsync(
        capturedPhoto,
        [
          {
            crop: {
              originX: Math.round(imageX),
              originY: Math.round(imageY),
              width: Math.round(imageWidth),
              height: Math.round(imageHeight)
            },
          },
          // Only resize if the image is very large
          ...(imageWidth > 1200 ? [{ resize: { width: 1200 } }] : [])
        ],
        { format: SaveFormat.JPEG }
      );

      // Save processed image for debugging
      const debugPath = `${FileSystem.cacheDirectory}debug_crop.jpg`;
      await FileSystem.copyAsync({
        from: processedImage.uri,
        to: debugPath
      });
      console.log('Saved processed image for debug at:', debugPath);

      // Convert to base64
      const base64 = await FileSystem.readAsStringAsync(processedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Base64 image length:', base64.length);
      if (base64.length < 1000) {
        throw new Error('Cropped image is too small or empty');
      }

      // Get the expression from GPT-4 Vision
      const expression = await analyzeImage(base64);
      console.log('Expression from GPT:', expression);
      
      // Get the solution from GPT-3.5
      const solution = await solveExpression(expression);
      console.log('Solution from GPT:', solution);

      // Navigate to solution screen
      router.push({
        pathname: '/solution',
        params: {
          expression: solution.expression || expression,
          answer: solution.answer || 'Could not solve',
          steps: JSON.stringify(solution.steps) || '[]',
        },
      });
    } catch (error) {
      console.error('Error processing image:', error);
      // Show error in UI with more details
      Alert.alert(
        'Error',
        `Failed to process the image: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.cameraContainer}>
        {capturedPhoto ? (
          <Image 
            source={{ uri: capturedPhoto }} 
            style={styles.camera}
            resizeMode="contain"
          />
        ) : (
          <CameraView 
            style={styles.camera} 
            facing={facing}
            enableTorch={flashEnabled}
            ref={cameraRef}
          />
        )}
        
        <View style={styles.overlay}>
          <View style={styles.frameContainer}>
            <Text style={styles.headerText}>
              {capturedPhoto ? 'Adjust crop area' : 'Take a picture of a question'}
            </Text>
          </View>
          <View style={[
            styles.cropFrame,
            {
              position: 'absolute',
              left: cropPosition.x,
              top: cropPosition.y + 100,
              width: cropPosition.width,
              height: cropPosition.height,
              borderColor: capturedPhoto ? '#6C5CE7' : 'white',
            }
          ]}>
            <View 
              {...(capturedPhoto ? tlPanResponder.panHandlers : {})} 
              style={[styles.corner, styles.cornerTL, { borderColor: capturedPhoto ? '#6C5CE7' : 'white' }]} 
            />
            <View 
              {...(capturedPhoto ? trPanResponder.panHandlers : {})} 
              style={[styles.corner, styles.cornerTR, { borderColor: capturedPhoto ? '#6C5CE7' : 'white' }]} 
            />
            <View 
              {...(capturedPhoto ? blPanResponder.panHandlers : {})} 
              style={[styles.corner, styles.cornerBL, { borderColor: capturedPhoto ? '#6C5CE7' : 'white' }]} 
            />
            <View 
              {...(capturedPhoto ? brPanResponder.panHandlers : {})} 
              style={[styles.corner, styles.cornerBR, { borderColor: capturedPhoto ? '#6C5CE7' : 'white' }]} 
            />
          </View>
        </View>

        <View style={styles.controls}>
          {capturedPhoto ? (
            <>
              <TouchableOpacity style={styles.controlButton} onPress={handleRetake}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <View style={styles.confirmButtonInner}>
                  <Ionicons name="checkmark" size={32} color="#6C5CE7" />
                </View>
              </TouchableOpacity>
              <View style={styles.controlButton} />
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
                <Ionicons 
                  name={flashEnabled ? "flash" : "flash-off"} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton}>
                <Ionicons name="images-outline" size={24} color="white" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {isProcessing && (
        <Animated.View 
          style={[
            styles.loadingModal,
            {
              transform: [{
                translateY: loadingAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#6C5CE7" />
            <Text style={styles.loadingText}>Understanding your question</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  frameContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 60,
    marginBottom: 20,
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  cropFrame: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: -4,
    left: -4,
    borderLeftWidth: 4,
    borderTopWidth: 4,
  },
  cornerTR: {
    top: -4,
    right: -4,
    borderRightWidth: 4,
    borderTopWidth: 4,
  },
  cornerBL: {
    bottom: -4,
    left: -4,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
  },
  cornerBR: {
    bottom: -4,
    right: -4,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'black',
  },
  controlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'white',
  },
  confirmButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  confirmButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  text: {
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  loadingModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    marginTop: 12,
  },
}); 