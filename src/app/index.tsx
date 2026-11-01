
import { useEffect, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
};

const BACKEND_URL = 'http://10.0.2.2:3000';

export default function HomeScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('Connected to Meta Leads backend:', socket.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from Meta Leads backend');
    });

    socket.on('connect_error', (error) => {
      setConnected(false);
      console.log('Socket connection error:', error.message);
    });

    socket.on('new_lead', (data: Partial<Lead>) => {
      console.log('New lead received:', data);

      const lead: Lead = {
        id: String(data.id ?? Date.now()),
        name: data.name ?? 'Unknown lead',
        email: data.email ?? '',
        phone: data.phone ?? '',
        createdAt: data.createdAt
          ? String(data.createdAt)
          : new Date().toLocaleString(),
      };

      setLeads((previous) => [
        lead,
        ...previous.filter((item) => item.id !== lead.id),
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const renderLead = ({ item }: { item: Lead }) => (
    <View style={styles.leadCard}>
      <Text style={styles.leadName}>
        {item.name || 'Unknown lead'}
      </Text>
      <Text style={styles.detail}>
        {item.email || 'No email provided'}
      </Text>
      <Text style={styles.detail}>
        {item.phone || 'No phone provided'}
      </Text>
      <Text style={styles.time}>{item.createdAt}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>LEAD MANAGEMENT</Text>
        <Text style={styles.title}>Meta Leads</Text>
        <Text style={styles.subtitle}>
          Real-time leads from your Meta lead form
        </Text>
      </View>

      <View style={styles.statusCard}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: connected ? '#24B47E' : '#E7A23B',
            },
          ]}
        />
        <View>
          <Text style={styles.statusTitle}>Live lead feed</Text>
          <Text style={styles.statusSubtitle}>
            {connected
              ? 'Connected — waiting for incoming leads'
              : 'Connecting to backend...'}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent leads</Text>
        <Text style={styles.count}>{leads.length} total</Text>
      </View>

      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        renderItem={renderLead}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>↗</Text>
            <Text style={styles.emptyTitle}>No leads yet</Text>
            <Text style={styles.emptyText}>
              Submit a test lead through Meta's Lead Ads Testing Tool.
              New leads will appear here automatically.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    paddingHorizontal: 22,
  },
  header: {
    paddingTop: 28,
    paddingBottom: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: '#5365D8',
    marginBottom: 9,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#172033',
  },
  subtitle: {
    fontSize: 14,
    color: '#68738A',
    marginTop: 7,
    lineHeight: 21,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E9ECF5',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 13,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#172033',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#68738A',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#172033',
  },
  count: {
    fontSize: 12,
    color: '#68738A',
  },
  list: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  leadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECF5',
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 9,
  },
  detail: {
    fontSize: 13,
    color: '#59657B',
    marginBottom: 5,
  },
  time: {
    fontSize: 11,
    color: '#8B94A7',
    marginTop: 5,
  },
  emptyCard: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9ECF5',
  },
  emptyIcon: {
    fontSize: 36,
    color: '#5365D8',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#172033',
    marginBottom: 9,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#68738A',
    textAlign: 'center',
  },
});
