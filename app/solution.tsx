import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Route } from 'expo-router';

interface Step {
  equation: string;
  description: string;
}

type Params = {
  answer: string;
  steps: string; // JSON string of Step[]
  expression: string;
} & Route;

export default function SolutionScreen() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const { answer, steps: stepsJson, expression } = params;

  // Parse the steps from JSON
  const steps: Step[] = React.useMemo(() => {
    try {
      return JSON.parse(stepsJson || '[]');
    } catch (e) {
      console.error('Failed to parse steps:', e);
      return [];
    }
  }, [stepsJson]);

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Solving Steps</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
        {/* Steps */}
        {steps.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <Text style={styles.equation}>{step.equation}</Text>
            <Text style={styles.description}>{step.description}</Text>
            <View style={styles.separator} />
          </View>
        ))}

        {/* Solution */}
        <View style={styles.solutionContainer}>
          <Text style={styles.solutionLabel}>Solution</Text>
          <Text style={styles.solutionText}>{answer}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: '#dc143c',
    fontSize: 20,
    fontWeight: '500',
  },
  headerText: {
    fontSize: 36,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
  },
  stepContainer: {
    marginBottom: 20,
  },
  equation: {
    fontSize: 28,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 8,
  },
  description: {
    fontSize: 18,
    color: '#999',
    marginBottom: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginTop: 12,
  },
  solutionContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc143c',
    paddingLeft: 16,
    marginTop: 30,
    marginBottom: 20,
  },
  solutionLabel: {
    fontSize: 24,
    color: '#dc143c',
    fontWeight: '600',
    marginBottom: 8,
  },
  solutionText: {
    fontSize: 36,
    fontWeight: '700',
  },
}); 